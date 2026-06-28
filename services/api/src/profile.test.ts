import { describe, expect, it } from 'vitest'
import {
  createStructuredLogger,
  type ResolveAuthenticatedUserUseCase,
} from '@pim/application'
import { parseUtcTimestamp, parseUuidv7, type UserRecord } from '@pim/domain'
import {
  createInMemoryUserAddressRepository,
  createInMemoryUserRepository,
} from '../../../packages/infrastructure/src/in-memory-user-repositories.js'
import { createFakeClock, createFakeUuidGenerator } from '../../../packages/testkit/src/repository-fakes.js'
import { createAuthenticationMiddleware } from './authentication.js'
import { createProfileController } from './profile.js'
import { createUserProfileService } from '@pim/application'

function createUserRecord(): UserRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
    createdBy: null,
    countryCode: 'TH',
    deletedAt: null,
    displayName: 'สมชาย เมกเกอร์',
    id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f9001'),
    locale: 'th-TH',
    notificationPreferences: Object.freeze({
      marketingEmail: false,
      marketingPush: false,
      orderStatusEmail: true,
      orderStatusPush: true,
    }),
    onboardingCompletedAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
    onboardingRoleCode: 'BUYER',
    phoneE164: '+66812345678',
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

function createResolver(user: UserRecord): ResolveAuthenticatedUserUseCase {
  return Object.freeze({
    async execute() {
      return {
        externalIdentity: {
          email: 'somchai@example.com',
          emailVerified: true,
          provider: 'firebase' as const,
          providerSubject: 'firebase-user-001',
          safeClaims: Object.freeze({ role: 'buyer' }),
        },
        identity: Object.freeze({
          createdAt: user.createdAt,
          createdBy: null,
          deletedAt: null,
          emailNormalized: 'somchai@example.com',
          emailVerified: true,
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f9002'),
          provider: 'firebase',
          providerSubject: 'firebase-user-001',
          schemaVersion: 1,
          updatedAt: user.updatedAt,
          updatedBy: null,
          userId: user.id,
          version: 1,
        }),
        isNewUser: false,
        user,
      }
    },
  })
}

describe('profile API controller', () => {
  it('returns a public/private profile envelope for authenticated reads', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const user = createUserRecord()
    const users = createInMemoryUserRepository({ clock })
    const addresses = createInMemoryUserAddressRepository({ clock })
    await users.create({
      id: user.id,
      countryCode: user.countryCode,
      displayName: user.displayName,
      locale: user.locale,
      notificationPreferences: user.notificationPreferences,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboardingRoleCode: user.onboardingRoleCode,
      phoneE164: user.phoneE164,
      profileImageAssetId: user.profileImageAssetId,
      privacyPreferences: user.privacyPreferences,
      status: user.status,
    })

    const authentication = createAuthenticationMiddleware({
      logger: createStructuredLogger({
        sink() {
          return undefined
        },
      }),
      resolver: createResolver(user),
    })

    const controller = createProfileController({
      authentication,
      profileService: createUserProfileService({
        addresses,
        clock,
        users,
        uuidGenerator: createFakeUuidGenerator([]),
      }),
    })

    const result = await controller.getMe({
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      data: {
        publicProfile: {
          displayName: 'สมชาย เมกเกอร์',
          locale: 'th-TH',
        },
        privateProfile: {
          countryCode: 'TH',
          phoneE164: '+66812345678',
        },
      },
    })
    expect(JSON.stringify(result.body)).not.toContain('authorization')
  })

  it('maps stale expectedVersion updates to a 409 conflict response', async () => {
    const clock = createFakeClock('2026-06-27T13:00:00.000Z')
    const user = createUserRecord()
    const users = createInMemoryUserRepository({ clock })
    const addresses = createInMemoryUserAddressRepository({ clock })
    await users.create({
      id: user.id,
      countryCode: user.countryCode,
      displayName: user.displayName,
      locale: user.locale,
      notificationPreferences: user.notificationPreferences,
      onboardingCompletedAt: user.onboardingCompletedAt,
      onboardingRoleCode: user.onboardingRoleCode,
      phoneE164: user.phoneE164,
      profileImageAssetId: user.profileImageAssetId,
      privacyPreferences: user.privacyPreferences,
      status: user.status,
    })

    const authentication = createAuthenticationMiddleware({
      logger: createStructuredLogger({
        sink() {
          return undefined
        },
      }),
      resolver: createResolver(user),
    })

    const controller = createProfileController({
      authentication,
      profileService: createUserProfileService({
        addresses,
        clock,
        users,
        uuidGenerator: createFakeUuidGenerator([]),
      }),
    })

    const first = await controller.patchMe({
      body: {
        displayName: 'Somchai Maker',
        expectedVersion: 1,
        locale: 'en-US',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    const stale = await controller.patchMe({
      body: {
        displayName: 'Somchai Maker 2',
        expectedVersion: 1,
        locale: 'en-GB',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    expect(first.status).toBe(200)
    expect(stale).toMatchObject({
      body: {
        error: {
          code: 'RESOURCE_VERSION_CONFLICT',
          fields: ['expectedVersion'],
        },
      },
      status: 409,
    })
    expect((await users.findById(user.id))?.displayName).toBe('Somchai Maker')
  })
})
