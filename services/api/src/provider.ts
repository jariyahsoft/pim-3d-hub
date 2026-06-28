import {
  createProviderProfileRequestSchema,
  createProviderServiceRequestSchema,
  providerOnboardingOverviewResponseSchema,
  providerServiceResponseSchema,
  providerWorkspaceResponseSchema,
  publicProviderCardResponseSchema,
  publicProviderProfileResponseSchema,
  updateProviderProfileRequestSchema,
  updateProviderServiceRequestSchema,
} from '@pim/contracts'
import {
  AuthorizationDeniedError,
  ProviderNotFoundError,
  type ProviderServiceManager,
} from '@pim/application'
import { RepositoryConflictError, parseUuidv7, type Uuidv7 } from '@pim/domain'
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
  providerService: ProviderServiceManager
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
    'ข้อมูลโปรไฟล์ผู้ให้บริการมีการเปลี่ยนแปลง',
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

  if (error instanceof ProviderNotFoundError) {
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

function resolveRequestId(headers: RequestHeaders): string {
  const requestId = headers['x-request-id']?.trim()
  return requestId && requestId.length > 0 ? requestId : 'public-provider-card'
}

export function createProviderController(deps: ControllerDependencies) {
  return Object.freeze({
    async createProviderProfile(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.profile.manage.self')
      if ('status' in auth) {
        return auth
      }

      const parsed = createProviderProfileRequestSchema.safeParse(input.body)
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
        const profile = await deps.providerService.createProviderProfile({
          actorUserId: auth.userId,
          publicName: parsed.data.publicName,
          serviceRegion: parsed.data.serviceRegion,
          status: parsed.data.status,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            publicProviderProfileResponseSchema.shape.data.parse(profile),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async createProviderService(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.profile.manage.self')
      if ('status' in auth) {
        return auth
      }

      const parsed = createProviderServiceRequestSchema.safeParse(input.body)
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
        const service = await deps.providerService.createProviderService({
          actorUserId: auth.userId,
          instantOrderEnabled: parsed.data.instantOrderEnabled,
          leadTimeDays: parsed.data.leadTimeDays,
          providerProfileId: parseUuidv7(parsed.data.providerProfileId),
          serviceDescription: parsed.data.serviceDescription,
          serviceName: parsed.data.serviceName,
          serviceRegion: parsed.data.serviceRegion,
          serviceType: parsed.data.serviceType,
          status: parsed.data.status,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            providerServiceResponseSchema.shape.data.parse(service),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getProviderProfile(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.profile.manage.self')
      if ('status' in auth) {
        return auth
      }

      const profileId = parseParamUuid(
        auth.context.requestId,
        input.params?.['profileId'],
        'profileId',
      )
      if (typeof profileId !== 'string') {
        return profileId
      }

      try {
        const profile = await deps.providerService.getProviderProfile({
          actorUserId: auth.userId,
          profileId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            publicProviderProfileResponseSchema.shape.data.parse(profile),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getProviderOnboardingOverview(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.profile.manage.self')
      if ('status' in auth) {
        return auth
      }

      const profileId = parseParamUuid(
        auth.context.requestId,
        input.params?.['profileId'],
        'profileId',
      )
      if (typeof profileId !== 'string') {
        return profileId
      }

      try {
        const overview = await deps.providerService.getProviderOnboardingOverview({
          actorUserId: auth.userId,
          profileId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            providerOnboardingOverviewResponseSchema.shape.data.parse(overview),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getProviderWorkspace(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.profile.manage.self')
      if ('status' in auth) {
        return auth
      }

      const profileId = parseParamUuid(
        auth.context.requestId,
        input.params?.['profileId'],
        'profileId',
      )
      if (typeof profileId !== 'string') {
        return profileId
      }

      try {
        const workspace = await deps.providerService.getProviderWorkspace({
          actorUserId: auth.userId,
          profileId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            providerWorkspaceResponseSchema.shape.data.parse(workspace),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getPublicProviderCard(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const requestId = resolveRequestId(input.headers)
      const profileId = parseParamUuid(requestId, input.params?.['profileId'], 'profileId')
      if (typeof profileId !== 'string') {
        return profileId
      }

      try {
        const card = await deps.providerService.getPublicProviderCard({
          profileId,
        })

        return {
          body: createSuccessEnvelope(
            requestId,
            publicProviderCardResponseSchema.shape.data.parse(card),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(requestId, error)
      }
    },

    async updateProviderProfile(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.profile.manage.self')
      if ('status' in auth) {
        return auth
      }

      const profileId = parseParamUuid(
        auth.context.requestId,
        input.params?.['profileId'],
        'profileId',
      )
      if (typeof profileId !== 'string') {
        return profileId
      }

      const parsed = updateProviderProfileRequestSchema.safeParse(input.body)
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
        const profile = await deps.providerService.updateProviderProfile({
          actorUserId: auth.userId,
          expectedVersion: parsed.data.expectedVersion,
          profileId,
          publicName: parsed.data.publicName,
          serviceRegion: parsed.data.serviceRegion,
          status: parsed.data.status,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            publicProviderProfileResponseSchema.shape.data.parse(profile),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async updateProviderService(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.profile.manage.self')
      if ('status' in auth) {
        return auth
      }

      const serviceId = parseParamUuid(
        auth.context.requestId,
        input.params?.['serviceId'],
        'serviceId',
      )
      if (typeof serviceId !== 'string') {
        return serviceId
      }

      const parsed = updateProviderServiceRequestSchema.safeParse(input.body)
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
        const service = await deps.providerService.updateProviderService({
          actorUserId: auth.userId,
          expectedVersion: parsed.data.expectedVersion,
          instantOrderEnabled: parsed.data.instantOrderEnabled,
          leadTimeDays: parsed.data.leadTimeDays,
          serviceDescription: parsed.data.serviceDescription,
          serviceId,
          serviceName: parsed.data.serviceName,
          serviceRegion: parsed.data.serviceRegion,
          status: parsed.data.status,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            providerServiceResponseSchema.shape.data.parse(service),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },
  })
}
