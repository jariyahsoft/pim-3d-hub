import {
  createPrinterCapabilityRequestSchema,
  createPrinterRequestSchema,
  createProviderMaterialRequestSchema,
  printerCapabilityResponseSchema,
  printerResponseSchema,
  printerWorkspaceResponseSchema,
  providerMaterialResponseSchema,
  updatePrinterRequestSchema,
} from '@pim/contracts'
import {
  AuthorizationDeniedError,
  PrinterNotFoundError,
  type PrinterServiceManager,
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
  printerService: PrinterServiceManager
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
    'ข้อมูลเครื่องพิมพ์มีการเปลี่ยนแปลง',
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
    return { body: createVersionConflictError(requestId), status: 409 }
  }

  if (error instanceof PrinterNotFoundError) {
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

export function createPrinterController(deps: ControllerDependencies) {
  return Object.freeze({
    async createPrinter(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.printer.manage.self')
      if ('status' in auth) {
        return auth
      }

      const parsed = createPrinterRequestSchema.safeParse(input.body)
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
        const printer = await deps.printerService.createPrinter({
          actorUserId: auth.userId,
          buildVolumeMm: parsed.data.buildVolumeMm,
          modelCode: parsed.data.modelCode,
          providerProfileId: parseUuidv7(parsed.data.providerProfileId),
          quantity: parsed.data.quantity,
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
          technologyCode: parsed.data.technologyCode,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            printerResponseSchema.shape.data.parse(printer),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async updatePrinter(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.printer.manage.self')
      if ('status' in auth) {
        return auth
      }

      const printerId = parseParamUuid(auth.context.requestId, input.params?.['printerId'], 'printerId')
      if (typeof printerId !== 'string') {
        return printerId
      }

      const parsed = updatePrinterRequestSchema.safeParse(input.body)
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
        const printer = await deps.printerService.updatePrinter({
          actorUserId: auth.userId,
          buildVolumeMm: parsed.data.buildVolumeMm,
          expectedVersion: parsed.data.expectedVersion,
          modelCode: parsed.data.modelCode,
          printerId,
          quantity: parsed.data.quantity,
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
          technologyCode: parsed.data.technologyCode,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            printerResponseSchema.shape.data.parse(printer),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async createPrinterCapability(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.printer.manage.self')
      if ('status' in auth) {
        return auth
      }

      const printerId = parseParamUuid(auth.context.requestId, input.params?.['printerId'], 'printerId')
      if (typeof printerId !== 'string') {
        return printerId
      }

      const parsed = createPrinterCapabilityRequestSchema.safeParse(input.body)
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
        const capability = await deps.printerService.createPrinterCapability({
          actorUserId: auth.userId,
          materialCode: parsed.data.materialCode,
          printerId,
          qualityCode: parsed.data.qualityCode,
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            printerCapabilityResponseSchema.shape.data.parse(capability),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async createProviderMaterial(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.printer.manage.self')
      if ('status' in auth) {
        return auth
      }

      const parsed = createProviderMaterialRequestSchema.safeParse(input.body)
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
        const material = await deps.printerService.createProviderMaterial({
          actorUserId: auth.userId,
          colorCode: parsed.data.colorCode,
          materialCode: parsed.data.materialCode,
          providerProfileId: parseUuidv7(parsed.data.providerProfileId),
          quantityGrams: parsed.data.quantityGrams,
          ...(parsed.data.stockStatus !== undefined ? { stockStatus: parsed.data.stockStatus } : {}),
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            providerMaterialResponseSchema.shape.data.parse(material),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getPrinterWorkspace(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.printer.manage.self')
      if ('status' in auth) {
        return auth
      }

      const providerProfileId = parseParamUuid(
        auth.context.requestId,
        input.params?.['providerProfileId'],
        'providerProfileId',
      )
      if (typeof providerProfileId !== 'string') {
        return providerProfileId
      }

      try {
        const workspace = await deps.printerService.getPrinterWorkspace({
          actorUserId: auth.userId,
          providerProfileId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            printerWorkspaceResponseSchema.shape.data.parse(workspace),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },
  })
}
