import {
  acceptOrganizationInvitationRequestSchema,
  createOrganizationRequestSchema,
  inviteOrganizationMemberRequestSchema,
  organizationMembershipResponseSchema,
  organizationResponseSchema,
  requestRoleActivationRequestSchema,
  reviewVerificationCaseRequestSchema,
  roleAssignmentResponseSchema,
  submitVerificationCaseRequestSchema,
  trustOverviewResponseSchema,
  updateOrganizationMembershipRequestSchema,
  verificationCaseResponseSchema,
} from '@pim/contracts'
import {
  AuthorizationDeniedError,
  TrustNotFoundError,
  type TrustService,
} from '@pim/application'
import { RepositoryConflictError, parseUuidv7, type Uuidv7 } from '@pim/domain'
import { createAuthenticationMiddleware, type ProtectedRequestAuthenticationResult } from './authentication.js'

type RequestHeaders = Readonly<Record<string, string | undefined>>

type JsonHandlerInput = Readonly<{
  body?: unknown
  headers: RequestHeaders
  params?: Readonly<Record<string, string | undefined>>
}>

type JsonHandlerResult = Readonly<{
  body: unknown
  status: number
}>

type ControllerDependencies = Readonly<{
  authentication: ReturnType<typeof createAuthenticationMiddleware>
  trustService: TrustService
}>

function createSuccessEnvelope<T>(requestId: string, data: T): Readonly<{
  data: T
  meta: Readonly<{
    nextCursor: null
    requestId: string
  }>
}> {
  return {
    data,
    meta: {
      nextCursor: null,
      requestId,
    },
  }
}

function createErrorEnvelope(
  requestId: string,
  code: string,
  fields: readonly string[],
  message: string,
) {
  return {
    error: {
      code,
      details: {},
      fields: [...fields],
      message,
      requestId,
    },
  }
}

function createValidationError(
  requestId: string,
  fields: readonly string[],
  message = 'ข้อมูลไม่ถูกต้อง',
) {
  return createErrorEnvelope(requestId, 'VALIDATION_ERROR', fields, message)
}

function createVersionConflictError(requestId: string) {
  return createErrorEnvelope(
    requestId,
    'RESOURCE_VERSION_CONFLICT',
    ['expectedVersion'],
    'ข้อมูลมีการเปลี่ยนแปลง',
  )
}

function createAuthorizationError(requestId: string) {
  return createErrorEnvelope(
    requestId,
    'AUTHORIZATION_DENIED',
    [],
    'คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้',
  )
}

function createNotFoundError(requestId: string) {
  return createErrorEnvelope(requestId, 'RESOURCE_NOT_FOUND', [], 'ไม่พบทรัพยากรที่ต้องการ')
}

function mapServiceError(requestId: string, error: unknown): JsonHandlerResult {
  if (error instanceof RepositoryConflictError) {
    return {
      body: createVersionConflictError(requestId),
      status: 409,
    }
  }

  if (error instanceof TrustNotFoundError) {
    return {
      body: createNotFoundError(requestId),
      status: 404,
    }
  }

  if (error instanceof AuthorizationDeniedError) {
    return {
      body: createAuthorizationError(requestId),
      status: 403,
    }
  }

  if (error instanceof Error && (error as { code?: string }).code === 'VALIDATION_ERROR') {
    const fields = ((error as { fields?: readonly string[] }).fields ?? []) as readonly string[]
    return {
      body: createValidationError(requestId, fields, error.message),
      status: 400,
    }
  }

  throw error
}

function toAuthenticatedResult(
  result: ProtectedRequestAuthenticationResult,
): asserts result is Extract<ProtectedRequestAuthenticationResult, { ok: true }> {
  if (!result.ok) {
    throw new Error('Expected authenticated request')
  }
}

async function withAuthenticatedUser(
  deps: ControllerDependencies,
  input: JsonHandlerInput,
  action: string,
): Promise<Readonly<{
  context: { requestId: string }
  userId: Uuidv7
} | { body: unknown; status: number }>> {
  const authResult = await deps.authentication.authenticate({
    action,
    headers: input.headers,
    module: 'api',
  })

  if (!authResult.ok) {
    return {
      body: authResult.response,
      status: authResult.status,
    }
  }

  toAuthenticatedResult(authResult)

  return {
    context: {
      requestId: authResult.context.requestId,
    },
    userId: authResult.actor.user.id,
  }
}

function parseParamUuid(
  requestId: string,
  value: string | undefined,
  field: string,
): JsonHandlerResult | Uuidv7 {
  if (!value) {
    return {
      body: createValidationError(requestId, [field]),
      status: 400,
    }
  }

  try {
    return parseUuidv7(value)
  } catch {
    return {
      body: createValidationError(requestId, [field]),
      status: 400,
    }
  }
}

export function createTrustController(deps: ControllerDependencies) {
  return Object.freeze({
    async acceptOrganizationInvitation(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'organizations.members.accept')
      if ('status' in auth) {
        return auth
      }

      const membershipId = parseParamUuid(
        auth.context.requestId,
        input.params?.['membershipId'],
        'membershipId',
      )
      if (typeof membershipId !== 'string') {
        return membershipId
      }

      const parsed = acceptOrganizationInvitationRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(
            auth.context.requestId,
            parsed.error.issues.map((issue) => issue.path.join('.')),
          ),
          status: 400,
        }
      }

      try {
        const membership = await deps.trustService.acceptOrganizationInvitation({
          actorUserId: auth.userId,
          expectedVersion: parsed.data.expectedVersion,
          membershipId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            organizationMembershipResponseSchema.shape.data.parse(membership),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async createOrganization(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'organizations.create')
      if ('status' in auth) {
        return auth
      }

      const parsed = createOrganizationRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(
            auth.context.requestId,
            parsed.error.issues.map((issue) => issue.path.join('.')),
          ),
          status: 400,
        }
      }

      try {
        const organization = await deps.trustService.createOrganization({
          actorUserId: auth.userId,
          name: parsed.data.name,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            organizationResponseSchema.shape.data.parse(organization),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getMyOverview(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.trust.read')
      if ('status' in auth) {
        return auth
      }

      try {
        const overview = await deps.trustService.getMyOverview({ userId: auth.userId })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            trustOverviewResponseSchema.shape.data.parse(overview),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getVerificationCase(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'verification-cases.read')
      if ('status' in auth) {
        return auth
      }

      const caseId = parseParamUuid(auth.context.requestId, input.params?.['caseId'], 'caseId')
      if (typeof caseId !== 'string') {
        return caseId
      }

      const auditReason =
        input.body && typeof input.body === 'object'
          ? (input.body as Record<string, unknown>)['auditReason']
          : undefined

      try {
        const verificationCase = await deps.trustService.getVerificationCase({
          actorUserId: auth.userId,
          auditReason: typeof auditReason === 'string' ? auditReason : undefined,
          caseId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            verificationCaseResponseSchema.shape.data.parse(verificationCase),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getOrganization(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'organizations.read')
      if ('status' in auth) {
        return auth
      }

      const organizationId = parseParamUuid(
        auth.context.requestId,
        input.params?.['organizationId'],
        'organizationId',
      )
      if (typeof organizationId !== 'string') {
        return organizationId
      }

      try {
        const organization = await deps.trustService.getOrganization({
          actorUserId: auth.userId,
          organizationId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            organizationResponseSchema.shape.data.parse(organization),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async inviteOrganizationMember(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'organizations.members.invite')
      if ('status' in auth) {
        return auth
      }

      const organizationId = parseParamUuid(
        auth.context.requestId,
        input.params?.['organizationId'],
        'organizationId',
      )
      if (typeof organizationId !== 'string') {
        return organizationId
      }

      const parsed = inviteOrganizationMemberRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(
            auth.context.requestId,
            parsed.error.issues.map((issue) => issue.path.join('.')),
          ),
          status: 400,
        }
      }

      try {
        const membership = await deps.trustService.inviteOrganizationMember({
          actorUserId: auth.userId,
          memberRoleCode: parsed.data.memberRoleCode,
          organizationId,
          userId: parseUuidv7(parsed.data.userId),
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            organizationMembershipResponseSchema.shape.data.parse(membership),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async requestRoleActivation(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.roles.request')
      if ('status' in auth) {
        return auth
      }

      const parsed = requestRoleActivationRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(
            auth.context.requestId,
            parsed.error.issues.map((issue) => issue.path.join('.')),
          ),
          status: 400,
        }
      }

      try {
        const role = await deps.trustService.requestRoleActivation({
          actorUserId: auth.userId,
          roleCode: parsed.data.roleCode,
          scopeId: parsed.data.scopeId ? parseUuidv7(parsed.data.scopeId) : null,
          scopeType: parsed.data.scopeType,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            roleAssignmentResponseSchema.shape.data.parse(role),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async reviewVerificationCase(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'verification-cases.review')
      if ('status' in auth) {
        return auth
      }

      const caseId = parseParamUuid(auth.context.requestId, input.params?.['caseId'], 'caseId')
      if (typeof caseId !== 'string') {
        return caseId
      }

      const parsed = reviewVerificationCaseRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(
            auth.context.requestId,
            parsed.error.issues.map((issue) => issue.path.join('.')),
          ),
          status: 400,
        }
      }

      try {
        const verificationCase = await deps.trustService.reviewVerificationCase({
          actorUserId: auth.userId,
          caseId,
          decision: parsed.data.decision,
          expectedVersion: parsed.data.expectedVersion,
          reason: parsed.data.reason,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            verificationCaseResponseSchema.shape.data.parse(verificationCase),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async submitVerificationCase(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'verification-cases.submit')
      if ('status' in auth) {
        return auth
      }

      const caseId = parseParamUuid(auth.context.requestId, input.params?.['caseId'], 'caseId')
      if (typeof caseId !== 'string') {
        return caseId
      }

      const parsed = submitVerificationCaseRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(
            auth.context.requestId,
            parsed.error.issues.map((issue) => issue.path.join('.')),
          ),
          status: 400,
        }
      }

      try {
        const verificationCase = await deps.trustService.submitVerificationCase({
          actorUserId: auth.userId,
          caseId,
          documents: parsed.data.documents.map((document) => ({
            assetId: document.assetId ? parseUuidv7(document.assetId) : null,
            maskedLabel: document.maskedLabel,
            sourceType: document.sourceType,
            vendorReference: document.vendorReference ?? null,
          })),
          expectedVersion: parsed.data.expectedVersion,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            verificationCaseResponseSchema.shape.data.parse(verificationCase),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async updateOrganizationMembership(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'organizations.members.manage')
      if ('status' in auth) {
        return auth
      }

      const membershipId = parseParamUuid(
        auth.context.requestId,
        input.params?.['membershipId'],
        'membershipId',
      )
      if (typeof membershipId !== 'string') {
        return membershipId
      }

      const parsed = updateOrganizationMembershipRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(
            auth.context.requestId,
            parsed.error.issues.map((issue) => issue.path.join('.')),
          ),
          status: 400,
        }
      }

      try {
        const membership = await deps.trustService.updateOrganizationMembership({
          actorUserId: auth.userId,
          expectedVersion: parsed.data.expectedVersion,
          memberRoleCode: parsed.data.memberRoleCode,
          membershipId,
          reason: parsed.data.reason,
          status: parsed.data.status,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            organizationMembershipResponseSchema.shape.data.parse(membership),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },
  })
}
