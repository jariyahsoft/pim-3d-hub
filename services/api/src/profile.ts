import {
  createUserAddressRequestSchema,
  currentUserProfileResponseSchema,
  onboardingRequestSchema,
  updateCurrentUserProfileRequestSchema,
  updateNotificationPreferencesRequestSchema,
  updatePrivacyPreferencesRequestSchema,
  updateUserAddressRequestSchema,
  userAddressListResponseSchema,
  userAddressResponseSchema,
} from '@pim/contracts'
import type { UserProfileService } from '@pim/application'
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
  profileService: UserProfileService
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

function createValidationError(
  requestId: string,
  fields: readonly string[],
  message = 'ข้อมูลไม่ถูกต้อง',
) {
  return {
    error: {
      code: 'VALIDATION_ERROR',
      details: {},
      fields: [...fields],
      message,
      requestId,
    },
  }
}

function createVersionConflictError(requestId: string) {
  return {
    error: {
      code: 'RESOURCE_VERSION_CONFLICT',
      details: {},
      fields: ['expectedVersion'],
      message: 'ข้อมูลโปรไฟล์มีการเปลี่ยนแปลง',
      requestId,
    },
  }
}

function normalizeOptionalUuidv7(value: string | null | undefined): Uuidv7 | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  return parseUuidv7(value)
}

function mapServiceError(requestId: string, error: unknown): JsonHandlerResult {
  if (error instanceof RepositoryConflictError) {
    return {
      body: createVersionConflictError(requestId),
      status: 409,
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

export function createProfileController(deps: ControllerDependencies) {
  return Object.freeze({
    async completeOnboarding(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.onboarding.complete')
      if ('status' in auth) {
        return auth
      }

      const parsed = onboardingRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(auth.context.requestId, parsed.error.issues.map((issue) => issue.path.join('.'))),
          status: 400,
        }
      }

      try {
        const profile = await deps.profileService.completeOnboarding({
          ...parsed.data,
          profileImageAssetId: normalizeOptionalUuidv7(parsed.data.profileImageAssetId),
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            currentUserProfileResponseSchema.shape.data.parse(profile),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async createAddress(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.addresses.create')
      if ('status' in auth) {
        return auth
      }

      const parsed = createUserAddressRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(auth.context.requestId, parsed.error.issues.map((issue) => issue.path.join('.'))),
          status: 400,
        }
      }

      try {
        const address = await deps.profileService.createAddress({
          ...parsed.data,
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            userAddressResponseSchema.shape.data.parse(address),
          ),
          status: 201,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async deleteAddress(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.addresses.delete')
      if ('status' in auth) {
        return auth
      }

      const rawId = input.params?.['addressId']
      if (!rawId) {
        return {
          body: createValidationError(auth.context.requestId, ['addressId']),
          status: 400,
        }
      }

      let id: Uuidv7
      try {
        id = parseUuidv7(rawId)
      } catch {
        return {
          body: createValidationError(auth.context.requestId, ['addressId']),
          status: 400,
        }
      }

      const expectedVersion = Number(
        input.body && typeof input.body === 'object'
          ? (input.body as Record<string, unknown>)['expectedVersion']
          : NaN,
      )
      if (!Number.isInteger(expectedVersion)) {
        return {
          body: createValidationError(auth.context.requestId, ['expectedVersion']),
          status: 400,
        }
      }

      try {
        const address = await deps.profileService.deleteAddress({
          expectedVersion,
          id,
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            userAddressResponseSchema.shape.data.parse(address),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getMe(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.me.read')
      if ('status' in auth) {
        return auth
      }

      try {
        const profile = await deps.profileService.getCurrentProfile({
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            currentUserProfileResponseSchema.shape.data.parse(profile),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async getAddresses(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.addresses.read')
      if ('status' in auth) {
        return auth
      }

      try {
        const profile = await deps.profileService.getCurrentProfile({
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            userAddressListResponseSchema.shape.data.parse({
              items: profile.addresses,
            }),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async patchMe(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.me.update')
      if ('status' in auth) {
        return auth
      }

      const parsed = updateCurrentUserProfileRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(auth.context.requestId, parsed.error.issues.map((issue) => issue.path.join('.'))),
          status: 400,
        }
      }

      try {
        const profile = await deps.profileService.updateProfile({
          ...parsed.data,
          profileImageAssetId: normalizeOptionalUuidv7(parsed.data.profileImageAssetId),
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            currentUserProfileResponseSchema.shape.data.parse(profile),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async patchNotificationPreferences(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.preferences.notification.update')
      if ('status' in auth) {
        return auth
      }

      const parsed = updateNotificationPreferencesRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(auth.context.requestId, parsed.error.issues.map((issue) => issue.path.join('.'))),
          status: 400,
        }
      }

      try {
        const profile = await deps.profileService.updateNotificationPreferences({
          ...parsed.data,
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            currentUserProfileResponseSchema.shape.data.parse(profile),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async patchPrivacyPreferences(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.preferences.privacy.update')
      if ('status' in auth) {
        return auth
      }

      const parsed = updatePrivacyPreferencesRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(auth.context.requestId, parsed.error.issues.map((issue) => issue.path.join('.'))),
          status: 400,
        }
      }

      try {
        const profile = await deps.profileService.updatePrivacyPreferences({
          ...parsed.data,
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            currentUserProfileResponseSchema.shape.data.parse(profile),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },

    async patchAddress(input: JsonHandlerInput): Promise<JsonHandlerResult> {
      const auth = await withAuthenticatedUser(deps, input, 'users.addresses.update')
      if ('status' in auth) {
        return auth
      }

      const rawId = input.params?.['addressId']
      if (!rawId) {
        return {
          body: createValidationError(auth.context.requestId, ['addressId']),
          status: 400,
        }
      }

      let id: Uuidv7
      try {
        id = parseUuidv7(rawId)
      } catch {
        return {
          body: createValidationError(auth.context.requestId, ['addressId']),
          status: 400,
        }
      }

      const parsed = updateUserAddressRequestSchema.safeParse(input.body)
      if (!parsed.success) {
        return {
          body: createValidationError(auth.context.requestId, parsed.error.issues.map((issue) => issue.path.join('.'))),
          status: 400,
        }
      }

      try {
        const address = await deps.profileService.updateAddress({
          ...parsed.data,
          id,
          userId: auth.userId,
        })

        return {
          body: createSuccessEnvelope(
            auth.context.requestId,
            userAddressResponseSchema.shape.data.parse(address),
          ),
          status: 200,
        }
      } catch (error) {
        return mapServiceError(auth.context.requestId, error)
      }
    },
  })
}
