import { describe, expect, it } from 'vitest'
import { createCapacityService, createStructuredLogger } from '@pim/application'
import { parseDimensionsMm, parseUtcTimestamp, parseUuidv7, type UserRecord } from '@pim/domain'
import {
  createInMemoryCapacityRepository,
  createInMemoryPrinterRepository,
  createInMemoryProviderProfileRepository,
  createInMemoryProviderServiceRepository,
  createFakeClock,
  createFakeUuidGenerator,
} from '../../../packages/testkit/src/index.js'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
} from '../../../packages/infrastructure/src/index.js'
import { createAuthenticationMiddleware } from './authentication.js'
import { createCapacityController } from './capacity.js'

function createUserRecord(id: string): UserRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
    createdBy: null,
    countryCode: 'TH',
    deletedAt: null,
    displayName: 'Somchai Capacity',
    id: parseUuidv7(id),
    locale: 'th-TH',
    notificationPreferences: Object.freeze({
      marketingEmail: false,
      marketingPush: false,
      orderStatusEmail: true,
      orderStatusPush: true,
    }),
    onboardingCompletedAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
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
    updatedAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
    updatedBy: null,
    version: 1,
  })
}

function createResolver(user: UserRecord) {
  return Object.freeze({
    async execute() {
      return {
        externalIdentity: {
          email: 'somchai@example.com',
          emailVerified: true,
          provider: 'firebase' as const,
          providerSubject: `firebase-${user.id}`,
          safeClaims: Object.freeze({ role: 'provider' }),
        },
        identity: Object.freeze({
          createdAt: user.createdAt,
          createdBy: null,
          deletedAt: null,
          emailNormalized: 'somchai@example.com',
          emailVerified: true,
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd999'),
          provider: 'firebase',
          providerSubject: `firebase-${user.id}`,
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

describe('capacity API controller', () => {
  it('returns a workspace without buyer-private reservation fields', async () => {
    const clock = createFakeClock('2026-06-28T10:00:00.000Z')
    const providerUser = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd401')
    const buyerUser = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd402')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const services = createInMemoryProviderServiceRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capacity = createInMemoryCapacityRepository({ clock })

    await users.create({ id: providerUser.id })
    await users.create({ id: buyerUser.id })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: providerUser.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd403'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: providerUser.id,
      userId: providerUser.id,
    })

    const capacityService = createCapacityService({
      capacityRepository: capacity.repository,
      clock,
      printers: printers.repository,
      providerProfiles: profiles.repository,
      providerServices: services.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator([
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd404',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd405',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd406',
      ]),
    })

    const profile = await profiles.repository.create({
      ownerUserId: providerUser.id,
      publicName: 'Capacity Hub',
      status: 'ACTIVE',
    })
    const providerService = await services.repository.create({
      leadTimeDays: 3,
      providerProfileId: profile.id,
      serviceDescription: 'Fast print queue',
      serviceName: 'Fast print queue',
      serviceRegion: 'Bangkok',
      serviceType: 'PRINT_ONLY',
      status: 'ACTIVE',
    })
    const printer = await printers.repository.create({
      buildVolumeMm: parseDimensionsMm({ depthMm: 220, heightMm: 220, widthMm: 220 }),
      modelCode: 'Bambu X1C',
      providerProfileId: profile.id,
      quantity: 1,
      status: 'ACTIVE',
      technologyCode: 'FDM',
    })
    const slot = await capacityService.createCapacitySlot({
      actorUserId: providerUser.id,
      endsAt: parseUtcTimestamp('2026-06-29T18:00:00.000Z'),
      printerId: printer.id,
      providerProfileId: profile.id,
      startsAt: parseUtcTimestamp('2026-06-29T09:00:00.000Z'),
      totalUnits: 2,
    })
    await capacityService.reserveCapacity({
      actorUserId: buyerUser.id,
      expiresAt: parseUtcTimestamp('2026-06-28T10:30:00.000Z'),
      idempotencyKey: 'hold-1',
      providerServiceId: providerService.id,
      slotId: slot.id,
      units: 1,
    })

    const controller = createCapacityController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(providerUser),
      }),
      capacityService,
    })

    const result = await controller.getCapacityWorkspace({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        providerProfileId: profile.id,
      },
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      data: {
        profile: {
          id: profile.id,
          publicName: 'Capacity Hub',
        },
        reservations: [
          {
            slotId: slot.id,
            status: 'ACTIVE',
            units: 1,
          },
        ],
      },
    })
    expect(JSON.stringify(result.body)).not.toContain('reservedByUserId')
  })

  it('maps a closed-slot reservation attempt to CAPACITY_UNAVAILABLE', async () => {
    const clock = createFakeClock('2026-06-28T10:00:00.000Z')
    const providerUser = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd411')
    const buyerUser = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd412')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const services = createInMemoryProviderServiceRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capacity = createInMemoryCapacityRepository({ clock })

    await users.create({ id: providerUser.id })
    await users.create({ id: buyerUser.id })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: providerUser.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd413'),
      roleCode: 'PRINT_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: providerUser.id,
      userId: providerUser.id,
    })

    const capacityService = createCapacityService({
      capacityRepository: capacity.repository,
      clock,
      printers: printers.repository,
      providerProfiles: profiles.repository,
      providerServices: services.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator([
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd414',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd415',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd416',
      ]),
    })

    const profile = await profiles.repository.create({
      ownerUserId: providerUser.id,
      publicName: 'Closed Day Hub',
      status: 'ACTIVE',
    })
    const providerService = await services.repository.create({
      leadTimeDays: 3,
      providerProfileId: profile.id,
      serviceDescription: 'Managed print queue',
      serviceName: 'Managed print queue',
      serviceRegion: 'Bangkok',
      serviceType: 'PRINT_ONLY',
      status: 'ACTIVE',
    })
    const printer = await printers.repository.create({
      buildVolumeMm: parseDimensionsMm({ depthMm: 220, heightMm: 220, widthMm: 220 }),
      modelCode: 'Bambu X1C',
      providerProfileId: profile.id,
      quantity: 1,
      status: 'ACTIVE',
      technologyCode: 'FDM',
    })
    const slot = await capacityService.createCapacitySlot({
      actorUserId: providerUser.id,
      endsAt: parseUtcTimestamp('2026-06-29T18:00:00.000Z'),
      printerId: printer.id,
      providerProfileId: profile.id,
      startsAt: parseUtcTimestamp('2026-06-29T09:00:00.000Z'),
      totalUnits: 1,
    })
    const closed = await capacityService.closeCapacitySlot({
      actorUserId: providerUser.id,
      expectedVersion: slot.version,
      reason: 'Maintenance',
      slotId: slot.id,
    })

    const controller = createCapacityController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(buyerUser),
      }),
      capacityService,
    })

    const result = await controller.reserveCapacity({
      body: {
        expiresAt: '2026-06-28T10:30:00.000Z',
        idempotencyKey: 'closed-slot',
        providerServiceId: providerService.id,
        units: 1,
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        slotId: closed.slot.id,
      },
    })

    expect(result.status).toBe(422)
    expect(result.body).toMatchObject({
      error: {
        code: 'CAPACITY_UNAVAILABLE',
        fields: ['slotId'],
      },
    })
  })
})
