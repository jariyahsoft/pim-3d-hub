import {
  capacityReservationResponseSchema,
  capacitySlotChangeResponseSchema,
  capacitySlotResponseSchema,
  capacityWorkspaceResponseSchema,
  closeCapacitySlotRequestSchema,
  createCapacitySlotRequestSchema,
  releaseCapacityReservationRequestSchema,
  reopenCapacitySlotRequestSchema,
  reserveCapacityRequestSchema,
  updateCapacitySlotRequestSchema,
} from '@pim/contracts'
import {
  AuthorizationDeniedError,
  CapacityNotFoundError,
  type CapacityService,
} from '@pim/application'
import {
  CapacityUnavailableError,
  IdempotencyConflictError,
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
  capacityService: CapacityService
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
    'ข้อมูลกำลังการผลิตมีการเปลี่ยนแปลง',
  )
}

function createIdempotencyConflictError(requestId: string) {
  return createErrorEnvelope(
    requestId,
    'IDEMPOTENCY_CONFLICT',
    ['idempotencyKey'],
    'idempotency key นี้ถูกใช้กับคำขออื่นแล้ว',
  )
}

function createCapacityUnavailableError(
  requestId: string,
  fields: readonly string[],
  message = 'กำลังการผลิตไม่พร้อมใช้งาน',
) {
  return createErrorEnvelope(requestId, 'CAPACITY_UNAVAILABLE', fields, message)
}

function mapServiceError(requestId: string, error: unknown): JsonHandlerResult {
  if (error instanceof RepositoryConflictError) {
    return { body: createVersionConflictError(requestId), status: 409 }
  }

  if (error instanceof IdempotencyConflictError) {
    return { body: createIdempotencyConflictError(requestId), status: 409 }
  }

  if (error instanceof CapacityUnavailableError) {
    return {
      body: createCapacityUnavailableError(requestId, error.fields, error.message),
      status: 422,
    }
  }

  if (error instanceof CapacityNotFoundError) {
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

export function createCapacityController(deps: ControllerDependencies) {
  return Object.freeze({
    async closeCapacitySlot(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.capacity.manage.self')
      if ('status' in auth) {
        return auth
      }

      const slotId = parseParamUuid(auth.context.requestId, input.params?.['slotId'], 'slotId')
      if (typeof slotId !== 'string') {
        return slotId
      }

      const parsed = closeCapacitySlotRequestSchema.safeParse(input.body)
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
        const result = await deps.capacityService.closeCapacitySlot({
          actorUserId: auth.userId,
          expectedVersion: parsed.data.expectedVersion,
          ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
          slotId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            capacitySlotChangeResponseSchema.shape.data.parse(result),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async createCapacitySlot(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.capacity.manage.self')
      if ('status' in auth) {
        return auth
      }

      const parsed = createCapacitySlotRequestSchema.safeParse(input.body)
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
        const result = await deps.capacityService.createCapacitySlot({
          actorUserId: auth.userId,
          endsAt: parseUtcTimestamp(parsed.data.endsAt),
          printerId: parseUuidv7(parsed.data.printerId),
          providerProfileId: parseUuidv7(parsed.data.providerProfileId),
          startsAt: parseUtcTimestamp(parsed.data.startsAt),
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
          totalUnits: parsed.data.totalUnits,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            capacitySlotResponseSchema.shape.data.parse(result),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getCapacityWorkspace(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.capacity.manage.self')
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
        const result = await deps.capacityService.getCapacityWorkspace({
          actorUserId: auth.userId,
          providerProfileId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            capacityWorkspaceResponseSchema.shape.data.parse(result),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async releaseCapacityReservation(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.capacity.manage.self')
      if ('status' in auth) {
        return auth
      }

      const reservationId = parseParamUuid(
        auth.context.requestId,
        input.params?.['reservationId'],
        'reservationId',
      )
      if (typeof reservationId !== 'string') {
        return reservationId
      }

      const parsed = releaseCapacityReservationRequestSchema.safeParse(input.body ?? {})
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
        const result = await deps.capacityService.releaseCapacityReservation({
          actorUserId: auth.userId,
          ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
          reservationId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            capacityReservationResponseSchema.shape.data.parse(result),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async reopenCapacitySlot(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.capacity.manage.self')
      if ('status' in auth) {
        return auth
      }

      const slotId = parseParamUuid(auth.context.requestId, input.params?.['slotId'], 'slotId')
      if (typeof slotId !== 'string') {
        return slotId
      }

      const parsed = reopenCapacitySlotRequestSchema.safeParse(input.body)
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
        const result = await deps.capacityService.reopenCapacitySlot({
          actorUserId: auth.userId,
          expectedVersion: parsed.data.expectedVersion,
          slotId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            capacitySlotChangeResponseSchema.shape.data.parse(result),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async reserveCapacity(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'marketplace.capacity.reserve')
      if ('status' in auth) {
        return auth
      }

      const slotId = parseParamUuid(auth.context.requestId, input.params?.['slotId'], 'slotId')
      if (typeof slotId !== 'string') {
        return slotId
      }

      const parsed = reserveCapacityRequestSchema.safeParse(input.body)
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
        const result = await deps.capacityService.reserveCapacity({
          actorUserId: auth.userId,
          expiresAt: parseUtcTimestamp(parsed.data.expiresAt),
          idempotencyKey: parsed.data.idempotencyKey,
          providerServiceId: parseUuidv7(parsed.data.providerServiceId),
          slotId,
          units: parsed.data.units,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            capacityReservationResponseSchema.shape.data.parse(result),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async updateCapacitySlot(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'providers.capacity.manage.self')
      if ('status' in auth) {
        return auth
      }

      const slotId = parseParamUuid(auth.context.requestId, input.params?.['slotId'], 'slotId')
      if (typeof slotId !== 'string') {
        return slotId
      }

      const parsed = updateCapacitySlotRequestSchema.safeParse(input.body)
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
        const result = await deps.capacityService.updateCapacitySlot({
          actorUserId: auth.userId,
          ...(parsed.data.endsAt !== undefined
            ? { endsAt: parseUtcTimestamp(parsed.data.endsAt) }
            : {}),
          expectedVersion: parsed.data.expectedVersion,
          slotId,
          ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
          ...(parsed.data.totalUnits !== undefined ? { totalUnits: parsed.data.totalUnits } : {}),
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            capacitySlotResponseSchema.shape.data.parse(result),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },
  })
}
