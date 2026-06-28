import { describe, expect, it } from 'vitest'
import {
  createProviderServiceManager,
  createStructuredLogger,
  type ResolveAuthenticatedUserUseCase,
} from '@pim/application'
import {
  parseDimensionsMm,
  parseUtcTimestamp,
  parseUuidv7,
  type UserRecord,
} from '@pim/domain'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
  createInMemoryVerificationCaseRepository,
} from '../../../packages/infrastructure/src/index.js'
import {
  createFakeClock,
  createFakeUuidGenerator,
  createInMemoryCapacityRepository,
  createInMemoryPrinterCapabilityRepository,
  createInMemoryPrinterRepository,
  createInMemoryProviderProfileRepository,
  createInMemoryProviderServiceRepository,
  createInMemoryProviderMaterialRepository,
  createInMemoryProviderTrustProjectionRepository,
} from '../../../packages/testkit/src/index.js'
import { createAuthenticationMiddleware } from './authentication.js'
import { createProviderController } from './provider.js'

function createUserRecord(id: string): UserRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp('2026-06-27T13:00:00.000Z'),
    createdBy: null,
    countryCode: 'TH',
    deletedAt: null,
    displayName: 'Somchai Maker',
    id: parseUuidv7(id),
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

function createHarness(user: UserRecord, uuidIds: readonly string[] = []) {
  const clock = createFakeClock('2026-06-27T13:00:00.000Z')
  const users = createInMemoryUserRepository({ clock })
  const roles = createInMemoryUserRoleRepository({ clock })
  const profiles = createInMemoryProviderProfileRepository({ clock })
  const services = createInMemoryProviderServiceRepository({ clock })
  const printers = createInMemoryPrinterRepository({ clock })
  const capabilities = createInMemoryPrinterCapabilityRepository({ clock })
  const materials = createInMemoryProviderMaterialRepository({ clock })
  const capacity = createInMemoryCapacityRepository({ clock })
  const trustProjections = createInMemoryProviderTrustProjectionRepository({ clock })
  const verificationCases = createInMemoryVerificationCaseRepository({ clock })

  const providerService = createProviderServiceManager({
    capacities: capacity.repository,
    capabilities: capabilities.repository,
    printers: printers.repository,
    providerProfiles: profiles.repository,
    providerMaterials: materials.repository,
    providerServices: services.repository,
    providerTrustProjections: trustProjections.repository,
    userRoles: roles,
    users,
    verificationCases,
    uuidGenerator: createFakeUuidGenerator(uuidIds),
  })

  const controller = createProviderController({
    authentication: createAuthenticationMiddleware({
      logger: createStructuredLogger({
        sink() {
          return undefined
        },
      }),
      resolver: createResolver(user),
    }),
    providerService,
  })

  return {
    capabilities,
    capacity,
    clock,
    controller,
    materials,
    printers,
    profiles,
    providerService,
    roles,
    services,
    trustProjections,
    users,
    verificationCases,
  }
}

describe('provider API controller', () => {
  it('returns a public workspace envelope without private ownership fields', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001')
    const harness = createHarness(user, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd201',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd202',
    ])

    await harness.users.create({ id: user.id })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd101'),
      roleCode: 'DESIGN_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const profile = await harness.providerService.createProviderProfile({
      actorUserId: user.id,
      publicName: 'Bangkok Design Lab',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'ACTIVE',
    })

    await harness.providerService.createProviderService({
      actorUserId: user.id,
      instantOrderEnabled: false,
      leadTimeDays: 5,
      providerProfileId: profile.id,
      serviceDescription: 'รับออกแบบพร้อมจัดเตรียมไฟล์',
      serviceName: 'Design Starter',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_ONLY',
      status: 'ACTIVE',
    })

    const result = await harness.controller.getProviderWorkspace({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        profileId: profile.id,
      },
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      data: {
        profile: {
          id: profile.id,
          publicName: 'Bangkok Design Lab',
          serviceRegion: 'กรุงเทพมหานคร',
          status: 'ACTIVE',
        },
        services: [
          {
            instantOrderEnabled: false,
            serviceName: 'Design Starter',
            serviceType: 'DESIGN_ONLY',
            status: 'ACTIVE',
          },
        ],
      },
    })
    expect(JSON.stringify(result.body)).not.toContain('ownerUserId')
    expect(JSON.stringify(result.body)).not.toContain('verification')
  })

  it('returns onboarding overview with optional printer setup for design-only providers', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd011')
    const harness = createHarness(user, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd211',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd212',
    ])

    await harness.users.create({ id: user.id })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd111'),
      roleCode: 'DESIGN_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const profile = await harness.providerService.createProviderProfile({
      actorUserId: user.id,
      publicName: 'Design Flow',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'ACTIVE',
    })

    await harness.providerService.createProviderService({
      actorUserId: user.id,
      leadTimeDays: 4,
      providerProfileId: profile.id,
      serviceDescription: 'บริการออกแบบสำหรับผู้เริ่มต้น',
      serviceName: 'Design Only',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_ONLY',
      status: 'ACTIVE',
    })

    const result = await harness.controller.getProviderOnboardingOverview({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        profileId: profile.id,
      },
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      data: {
        canPublishDesignOnly: true,
        canPublishInstantPrint: false,
        steps: expect.arrayContaining([
          expect.objectContaining({
            code: 'PRINTER_SETUP',
            required: false,
            status: 'OPTIONAL',
          }),
        ]),
      },
    })
  })

  it('rejects instant-capable print service activation without capability data', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd021')
    const harness = createHarness(user, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd221',
    ])

    await harness.users.create({ id: user.id })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd121'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const profile = await harness.providerService.createProviderProfile({
      actorUserId: user.id,
      publicName: 'Draft Provider',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'ACTIVE',
    })

    const result = await harness.controller.createProviderService({
      body: {
        instantOrderEnabled: true,
        leadTimeDays: 4,
        providerProfileId: profile.id,
        serviceDescription: 'รับพิมพ์เรซิน',
        serviceName: 'Print Starter',
        serviceRegion: 'กรุงเทพมหานคร',
        serviceType: 'PRINT_ONLY',
        status: 'ACTIVE',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    expect(result).toMatchObject({
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          fields: ['instantOrderEnabled'],
        },
      },
      status: 400,
    })
  })

  it('returns public provider cards without private fields', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd031')
    const harness = createHarness(user, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd231',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd233',
    ])

    await harness.users.create({ id: user.id })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd131'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const profile = await harness.providerService.createProviderProfile({
      actorUserId: user.id,
      publicName: 'Public Print Lab',
      serviceRegion: 'Bangkok',
      status: 'ACTIVE',
    })
    const printer = await harness.printers.repository.create({
      buildVolumeMm: parseDimensionsMm({ depthMm: 220, heightMm: 220, widthMm: 220 }),
      modelCode: 'Bambu X1C',
      providerProfileId: profile.id,
      quantity: 1,
      status: 'ACTIVE',
      technologyCode: 'FDM',
    })
    await harness.capabilities.repository.create({
      materialCode: 'PLA',
      printerId: printer.id,
      qualityCode: 'STANDARD',
      status: 'ACTIVE',
    })
    await harness.materials.repository.create({
      colorCode: 'BLACK',
      materialCode: 'PLA',
      providerProfileId: profile.id,
      quantityGrams: 1500,
      stockStatus: 'IN_STOCK',
    })
    await harness.providerService.createProviderService({
      actorUserId: user.id,
      instantOrderEnabled: true,
      leadTimeDays: 2,
      providerProfileId: profile.id,
      serviceDescription: 'Fast FDM print',
      serviceName: 'Fast Print',
      serviceRegion: 'Bangkok',
      serviceType: 'PRINT_ONLY',
      status: 'ACTIVE',
    })
    await harness.verificationCases.create({
      createdBy: user.id,
      documents: [],
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd232'),
      requestedRoleCode: 'PRINT_PROVIDER',
      status: 'APPROVED',
      subjectId: user.id,
      subjectType: 'USER',
      type: 'ROLE_KYC',
      updatedBy: user.id,
    })
    await harness.providerService.rebuildProviderTrustProjection({
      actorUserId: user.id,
      completedJobs: [
        Object.freeze({
          completedAt: parseUtcTimestamp('2026-06-26T12:00:00.000Z'),
          dueAt: parseUtcTimestamp('2026-06-26T18:00:00.000Z'),
          orderId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd299'),
          ratingScore: 5,
        }),
      ],
      providerProfileId: profile.id,
      sponsored: true,
    })

    const result = await harness.controller.getPublicProviderCard({
      headers: {
        'x-request-id': 'req-public-card',
      },
      params: {
        profileId: profile.id,
      },
    })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      data: {
        approvedBadge: true,
        leadTimeDaysMin: 2,
        onTimeRatePercent: 100,
        publicName: 'Public Print Lab',
        ratingAverage: 5,
        ratingCount: 1,
        serviceTypes: ['PRINT_ONLY'],
        sponsored: true,
      },
      meta: {
        requestId: 'req-public-card',
      },
    })
    expect(JSON.stringify(result.body)).not.toContain('ownerUserId')
    expect(JSON.stringify(result.body)).not.toContain('phoneE164')
    expect(JSON.stringify(result.body)).not.toContain('quantityGrams')
    expect(JSON.stringify(result.body)).not.toContain('printerId')
  })

  it('maps stale provider profile updates to a 409 response', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd041')
    const harness = createHarness(user, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd241',
    ])

    await harness.users.create({ id: user.id })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd141'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const profile = await harness.providerService.createProviderProfile({
      actorUserId: user.id,
      publicName: 'Race Provider',
      serviceRegion: 'เชียงใหม่',
    })

    const first = await harness.controller.updateProviderProfile({
      body: {
        expectedVersion: profile.version,
        publicName: 'Updated Race Provider',
        serviceRegion: 'เชียงใหม่',
        status: 'ACTIVE',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        profileId: profile.id,
      },
    })
    const stale = await harness.controller.updateProviderProfile({
      body: {
        expectedVersion: profile.version,
        publicName: 'Updated Race Provider Again',
        serviceRegion: 'เชียงใหม่',
        status: 'ACTIVE',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        profileId: profile.id,
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
  })
})
