import {
  createFileAssetAccessGrantRequestSchema,
  fileAssetAccessGrantResponseSchema,
  fileAssetDownloadAccessResponseSchema,
} from '@pim/contracts'
import {
  AuthorizationDeniedError,
  FileAccessNotFoundError,
  InvalidFileAccessStateError,
  type FileAccessService,
} from '@pim/application'
import {
  RepositoryConflictError,
  parseUtcTimestamp,
  parseUuidv7,
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
  fileAccess: FileAccessService
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

function createVersionConflictError(requestId: string) {
  return createErrorEnvelope(
    requestId,
    'RESOURCE_VERSION_CONFLICT',
    ['expectedVersion'],
    'ข้อมูลสิทธิ์เข้าถึงไฟล์มีการเปลี่ยนแปลง',
  )
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
    return { body: createVersionConflictError(requestId), status: 409 }
  }

  if (error instanceof InvalidFileAccessStateError) {
    return {
      body: createStateTransitionError(requestId, error.fields, error.message),
      status: 409,
    }
  }

  if (error instanceof FileAccessNotFoundError) {
    return { body: createNotFoundError(requestId), status: 404 }
  }

  if (error instanceof AuthorizationDeniedError) {
    return { body: createAuthorizationError(requestId), status: 403 }
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
    return { body: createValidationError(requestId, [field]), status: 400 }
  }

  try {
    return parseUuidv7(value)
  } catch {
    return { body: createValidationError(requestId, [field]), status: 400 }
  }
}

export function createFileAccessController(deps: ControllerDependencies) {
  return Object.freeze({
    async createAccessGrant(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'files.access-grants.create')
      if ('status' in auth) {
        return auth
      }

      const assetId = parseParamUuid(auth.context.requestId, input.params?.['assetId'], 'assetId')
      if (typeof assetId !== 'string') {
        return assetId
      }

      const parsed = createFileAssetAccessGrantRequestSchema.safeParse(input.body)
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
        const grant = await deps.fileAccess.createAccessGrant({
          actorUserId: auth.userId,
          assetId,
          contextId: parseUuidv7(parsed.data.contextId),
          contextType: parsed.data.contextType,
          expiresAt: parseUtcTimestamp(parsed.data.expiresAt),
          granteeUserId: parseUuidv7(parsed.data.granteeUserId),
          permissionCode: parsed.data.permissionCode,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            fileAssetAccessGrantResponseSchema.shape.data.parse(grant),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async requestDownloadAccess(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'files.download.request')
      if ('status' in auth) {
        return auth
      }

      const assetId = parseParamUuid(auth.context.requestId, input.params?.['assetId'], 'assetId')
      if (typeof assetId !== 'string') {
        return assetId
      }

      try {
        const access = await deps.fileAccess.requestDownloadAccess({
          actorUserId: auth.userId,
          assetId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            fileAssetDownloadAccessResponseSchema.shape.data.parse(access),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },
  })
}
