import { describe, expect, it } from 'vitest'
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  type ResolveAuthenticatedUserUseCase,
  createStructuredLogger,
} from '@pim/application'
import { parseUtcTimestamp, parseUuidv7, type UserRecord } from '@pim/domain'
import { createAuthenticationMiddleware } from './authentication.js'

function createUserRecord(): UserRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
    createdBy: null,
    deletedAt: null,
    countryCode: null,
    displayName: null,
    id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f9001'),
    onboardingCompletedAt: null,
    onboardingRoleCode: null,
    locale: null,
    notificationPreferences: Object.freeze({
      marketingEmail: false,
      marketingPush: false,
      orderStatusEmail: true,
      orderStatusPush: true,
    }),
    phoneE164: null,
    profileImageAssetId: null,
    privacyPreferences: Object.freeze({
      publicProfileVisible: true,
      shareAddressWithOrderParticipants: true,
      sharePhoneWithOrderParticipants: false,
      showProvince: true,
    }),
    schemaVersion: 1,
    status: 'ACTIVE',
    updatedAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
    updatedBy: null,
    version: 1,
  })
}

function createResolver(
  mode: 'success' | 'invalid' | 'suspended',
): ResolveAuthenticatedUserUseCase {
  return Object.freeze({
    async execute(_input) {
      if (mode === 'invalid') {
        throw new AuthenticationRequiredError()
      }

      if (mode === 'suspended') {
        throw new AuthorizationDeniedError()
      }

      return {
        externalIdentity: {
          email: 'person@example.com',
          emailVerified: true,
          provider: 'firebase' as const,
          providerSubject: 'firebase-user-009',
          safeClaims: Object.freeze({ role: 'buyer' }),
        },
        identity: Object.freeze({
          createdAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
          createdBy: null,
          deletedAt: null,
          emailNormalized: 'person@example.com',
          emailVerified: true,
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f9002'),
          provider: 'firebase',
          providerSubject: 'firebase-user-009',
          schemaVersion: 1,
          updatedAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
          updatedBy: null,
          userId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f9001'),
          version: 1,
        }),
        isNewUser: false,
        user: createUserRecord(),
      }
    },
  })
}

describe('API authentication middleware', () => {
  it('builds a protected request context for valid bearer tokens', async () => {
    const logs: string[] = []
    const middleware = createAuthenticationMiddleware({
      logger: createStructuredLogger({
        sink(line) {
          logs.push(line)
        },
      }),
      resolver: createResolver('success'),
    })

    const result = await middleware.authenticate({
      headers: {
        'x-request-id': 'req-fixed',
        authorization: 'Bearer valid-token',
      },
    })

    expect(result.ok).toBe(true)

    if (!result.ok) {
      throw new Error('Expected authenticated result')
    }

    expect(result.context.requestId).toBe('req-fixed')
    expect(result.context.userId).toBe('018f18b2-4c4f-7c7a-9e12-4c0b8a8f9001')
    expect(logs.join('\n')).not.toContain('valid-token')
  })

  it('returns AUTHENTICATION_REQUIRED when the bearer token is missing or invalid', async () => {
    const middleware = createAuthenticationMiddleware({
      logger: createStructuredLogger({
        sink() {
          return undefined
        },
      }),
      resolver: createResolver('invalid'),
    })

    const missingHeader = await middleware.authenticate({
      headers: {},
    })
    const invalidToken = await middleware.authenticate({
      headers: {
        authorization: 'Bearer invalid-token',
      },
    })

    expect(missingHeader).toMatchObject({
      ok: false,
      response: {
        error: {
          code: 'AUTHENTICATION_REQUIRED',
        },
      },
      status: 401,
    })
    expect(invalidToken).toMatchObject({
      ok: false,
      response: {
        error: {
          code: 'AUTHENTICATION_REQUIRED',
        },
      },
      status: 401,
    })
  })

  it('returns AUTHORIZATION_DENIED for suspended users', async () => {
    const middleware = createAuthenticationMiddleware({
      logger: createStructuredLogger({
        sink() {
          return undefined
        },
      }),
      resolver: createResolver('suspended'),
    })

    const result = await middleware.authenticate({
      headers: {
        authorization: 'Bearer suspended-token',
      },
    })

    expect(result).toMatchObject({
      ok: false,
      response: {
        error: {
          code: 'AUTHORIZATION_DENIED',
        },
      },
      status: 403,
    })
  })
})
