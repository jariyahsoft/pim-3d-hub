import {
  closeServiceRequestRequestSchema,
  createServiceRequestDraftRequestSchema,
  publishServiceRequestRequestSchema,
  serviceRequestResponseSchema,
  updateServiceRequestDraftRequestSchema,
} from '@pim/contracts'
import {
  AuthorizationDeniedError,
  InvalidServiceRequestStateError,
  ServiceRequestNotFoundError,
  type ServiceRequestService,
} from '@pim/application'
import {
  RepositoryConflictError,
  parseUuidv7,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'
import {
  createAuthenticationMiddleware,
  type ProtectedRequestAuthenticationResult,
} from './authentication.js'

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
  serviceRequests: ServiceRequestService
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
    'ข้อมูลคำขอรับบริการมีการเปลี่ยนแปลง',
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

function createStateTransitionError(
  requestId: string,
  fields: readonly string[],
  message: string,
) {
  return createErrorEnvelope(requestId, 'INVALID_STATE_TRANSITION', fields, message)
}

function mapServiceError(requestId: string, error: unknown): JsonHandlerResult {
  if (error instanceof RepositoryConflictError) {
    return {
      body: createVersionConflictError(requestId),
      status: 409,
    }
  }

  if (error instanceof InvalidServiceRequestStateError) {
    return {
      body: createStateTransitionError(requestId, error.fields, error.message),
      status: 409,
    }
  }

  if (error instanceof ServiceRequestNotFoundError) {
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
): Promise<
  | {
      context: { requestId: string }
      userId: Uuidv7
    }
  | { body: unknown; status: number }
> {
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

function toAttachmentInputs(
  attachments:
    | readonly {
        assetId: string
        mimeType: string | null
        originalFilename: string | null
        sizeBytes: number | null
      }[]
    | undefined,
) {
  return attachments?.map((attachment) => ({
    assetId: parseUuidv7(attachment.assetId),
    mimeType: attachment.mimeType,
    originalFilename: attachment.originalFilename,
    sizeBytes: attachment.sizeBytes,
  }))
}

export function createServiceRequestController(deps: ControllerDependencies) {
  return Object.freeze({
    async createDraft(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'serviceRequests.manage.self')
      if ('status' in auth) {
        return auth
      }

      const parsed = createServiceRequestDraftRequestSchema.safeParse(input.body)
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
        const request = await deps.serviceRequests.createDraft({
          actorUserId: auth.userId,
          attachments: toAttachmentInputs(parsed.data.attachments),
          budgetCurrency: parsed.data.budgetCurrency,
          budgetMinor: parsed.data.budgetMinor,
          category: parsed.data.category,
          description: parsed.data.description,
          dueAt: (parsed.data.dueAt ?? undefined) as UtcTimestamp | undefined,
          objective: parsed.data.objective,
          organizationId: parsed.data.organizationId ? parseUuidv7(parsed.data.organizationId) : null,
          prohibitedWorkAcknowledged: parsed.data.prohibitedWorkAcknowledged,
          quantity: parsed.data.quantity,
          serviceRegion: parsed.data.serviceRegion,
          serviceType: parsed.data.serviceType,
          title: parsed.data.title,
          visibility: parsed.data.visibility,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            serviceRequestResponseSchema.shape.data.parse(request),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getRequest(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'serviceRequests.read')
      if ('status' in auth) {
        return auth
      }

      const requestId = parseParamUuid(auth.context.requestId, input.params?.['requestId'], 'requestId')
      if (typeof requestId !== 'string') {
        return requestId
      }

      try {
        const request = await deps.serviceRequests.getRequest({
          actorUserId: auth.userId,
          requestId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            serviceRequestResponseSchema.shape.data.parse(request),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async updateDraft(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'serviceRequests.manage.self')
      if ('status' in auth) {
        return auth
      }

      const requestId = parseParamUuid(auth.context.requestId, input.params?.['requestId'], 'requestId')
      if (typeof requestId !== 'string') {
        return requestId
      }

      const parsed = updateServiceRequestDraftRequestSchema.safeParse(input.body)
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
        const request = await deps.serviceRequests.updateDraft({
          actorUserId: auth.userId,
          attachments: toAttachmentInputs(parsed.data.attachments),
          budgetCurrency: parsed.data.budgetCurrency,
          budgetMinor: parsed.data.budgetMinor,
          category: parsed.data.category,
          description: parsed.data.description,
          dueAt: (parsed.data.dueAt ?? undefined) as UtcTimestamp | undefined,
          expectedVersion: parsed.data.expectedVersion,
          objective: parsed.data.objective,
          organizationId: parsed.data.organizationId ? parseUuidv7(parsed.data.organizationId) : null,
          prohibitedWorkAcknowledged: parsed.data.prohibitedWorkAcknowledged,
          quantity: parsed.data.quantity,
          requestId,
          serviceRegion: parsed.data.serviceRegion,
          serviceType: parsed.data.serviceType,
          title: parsed.data.title,
          visibility: parsed.data.visibility,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            serviceRequestResponseSchema.shape.data.parse(request),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async publishRequest(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'serviceRequests.manage.self')
      if ('status' in auth) {
        return auth
      }

      const requestId = parseParamUuid(auth.context.requestId, input.params?.['requestId'], 'requestId')
      if (typeof requestId !== 'string') {
        return requestId
      }

      const parsed = publishServiceRequestRequestSchema.safeParse(input.body)
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
        const request = await deps.serviceRequests.publishRequest({
          actorUserId: auth.userId,
          expectedVersion: parsed.data.expectedVersion,
          requestId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            serviceRequestResponseSchema.shape.data.parse(request),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async closeRequest(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'serviceRequests.manage.self')
      if ('status' in auth) {
        return auth
      }

      const requestId = parseParamUuid(auth.context.requestId, input.params?.['requestId'], 'requestId')
      if (typeof requestId !== 'string') {
        return requestId
      }

      const parsed = closeServiceRequestRequestSchema.safeParse(input.body)
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
        const request = await deps.serviceRequests.closeRequest({
          actorUserId: auth.userId,
          expectedVersion: parsed.data.expectedVersion,
          note: parsed.data.note,
          requestId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            serviceRequestResponseSchema.shape.data.parse(request),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },
  })
}
