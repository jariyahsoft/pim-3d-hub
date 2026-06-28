import { describe, expect, it } from 'vitest'
import { createProviderServiceManager, ProviderNotFoundError } from './provider.js'
import { AuthorizationDeniedError } from './identity.js'
import { parseDimensionsMm, parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
  createInMemoryVerificationCaseRepository,
} from '../../infrastructure/src/index.js'
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
} from '../../testkit/src/index.js'

function createUserId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`)
}

function createHarness(uuidIds: readonly string[] = []) {
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

  const manager = createProviderServiceManager({
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

  return {
    capabilities,
    capacity,
    clock,
    manager,
    materials,
    printers,
    profiles,
    roles,
    services,
    trustProjections,
    users,
    verificationCases,
  }
}

describe('provider service manager', () => {
  it('publishes valid provider profiles and services without leaking private ownership fields', async () => {
    const harness = createHarness([
      createUserId('201'),
      createUserId('202'),
    ])
    const userId = createUserId('001')

    await harness.users.create({ id: userId })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: userId,
      id: createUserId('101'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    const profile = await harness.manager.createProviderProfile({
      actorUserId: userId,
      publicName: 'Bangkok Hub',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'ACTIVE',
    })

    const service = await harness.manager.createProviderService({
      actorUserId: userId,
      instantOrderEnabled: false,
      leadTimeDays: 4,
      providerProfileId: profile.id,
      serviceDescription: 'Full service design and print',
      serviceName: 'Full Service',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_AND_PRINT',
      status: 'ACTIVE',
    })

    const workspace = await harness.manager.getProviderWorkspace({
      actorUserId: userId,
      profileId: profile.id,
    })

    expect(profile).toEqual({
      id: profile.id,
      publicName: 'Bangkok Hub',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'ACTIVE',
      version: 1,
    })
    expect(service).toEqual({
      id: service.id,
      instantOrderEnabled: false,
      leadTimeDays: 4,
      providerProfileId: profile.id,
      serviceDescription: 'Full service design and print',
      serviceName: 'Full Service',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_AND_PRINT',
      status: 'ACTIVE',
      version: 1,
    })
    expect(workspace.profile).toEqual(profile)
    expect(JSON.stringify(workspace)).not.toContain('ownerUserId')
    expect(JSON.stringify(workspace)).not.toContain('verification')
  })

  it('allows design-only providers to publish active services without printer setup', async () => {
    const harness = createHarness([createUserId('211'), createUserId('212')])
    const userId = createUserId('011')

    await harness.users.create({ id: userId })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: userId,
      id: createUserId('111'),
      roleCode: 'DESIGN_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    const profile = await harness.manager.createProviderProfile({
      actorUserId: userId,
      publicName: 'Design Draft',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'ACTIVE',
    })
    const service = await harness.manager.createProviderService({
      actorUserId: userId,
      leadTimeDays: 4,
      providerProfileId: profile.id,
      serviceDescription: 'ออกแบบและเตรียมไฟล์ก่อนพิมพ์',
      serviceName: 'Design Only',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_ONLY',
      status: 'ACTIVE',
    })
    const overview = await harness.manager.getProviderOnboardingOverview({
      actorUserId: userId,
      profileId: profile.id,
    })

    expect(service.status).toBe('ACTIVE')
    expect(overview.canPublishDesignOnly).toBe(true)
    expect(overview.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'PRINTER_SETUP',
          required: false,
          status: 'OPTIONAL',
        }),
      ]),
    )
  })

  it('rejects invalid publish input, unsupported service combinations, and instant print without capability data', async () => {
    const harness = createHarness([createUserId('221'), createUserId('222')])
    const userId = createUserId('021')

    await harness.users.create({ id: userId })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: userId,
      id: createUserId('121'),
      roleCode: 'DESIGN_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    await expect(
      harness.manager.createProviderProfile({
        actorUserId: userId,
        publicName: ' ',
        serviceRegion: 'กรุงเทพมหานคร',
        status: 'ACTIVE',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: ['publicName'],
    })

    const profile = await harness.manager.createProviderProfile({
      actorUserId: userId,
      publicName: 'Draft Design',
      serviceRegion: 'กรุงเทพมหานคร',
    })

    await expect(
      harness.manager.createProviderService({
        actorUserId: userId,
        leadTimeDays: 4,
        providerProfileId: profile.id,
        serviceDescription: ' ',
        serviceName: 'Design Draft',
        serviceRegion: 'กรุงเทพมหานคร',
        serviceType: 'DESIGN_ONLY',
        status: 'ACTIVE',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: ['serviceDescription'],
    })

    await expect(
      harness.manager.createProviderService({
        actorUserId: userId,
        leadTimeDays: 4,
        providerProfileId: profile.id,
        serviceDescription: 'รับพิมพ์',
        serviceName: 'Print Draft',
        serviceRegion: 'กรุงเทพมหานคร',
        serviceType: 'PRINT_ONLY',
        status: 'ACTIVE',
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)

    const fullServiceUserId = createUserId('022')
    await harness.users.create({ id: fullServiceUserId })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: fullServiceUserId,
      id: createUserId('122'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: fullServiceUserId,
      userId: fullServiceUserId,
    })

    const printProfile = await harness.manager.createProviderProfile({
      actorUserId: fullServiceUserId,
      publicName: 'Print Lab',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'ACTIVE',
    })

    await expect(
      harness.manager.createProviderService({
        actorUserId: fullServiceUserId,
        instantOrderEnabled: true,
        leadTimeDays: 3,
        providerProfileId: printProfile.id,
        serviceDescription: 'รับพิมพ์พร้อมจัดคิวอัตโนมัติ',
        serviceName: 'Instant Print',
        serviceRegion: 'กรุงเทพมหานคร',
        serviceType: 'PRINT_ONLY',
        status: 'ACTIVE',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: ['instantOrderEnabled'],
    })
  })

  it('blocks suspended roles from re-activating a provider service', async () => {
    const harness = createHarness([
      createUserId('231'),
      createUserId('232'),
    ])
    const userId = createUserId('031')

    await harness.users.create({ id: userId })
    const role = await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: userId,
      id: createUserId('131'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    const profile = await harness.manager.createProviderProfile({
      actorUserId: userId,
      publicName: 'Pause Lab',
      serviceRegion: 'เชียงใหม่',
    })
    const service = await harness.manager.createProviderService({
      actorUserId: userId,
      leadTimeDays: 4,
      providerProfileId: profile.id,
      serviceDescription: 'Draft service',
      serviceName: 'Draft Full Service',
      serviceRegion: 'เชียงใหม่',
      serviceType: 'DESIGN_AND_PRINT',
    })

    const suspendedRole = await harness.roles.update(
      {
        ...role,
        status: 'SUSPENDED',
        updatedBy: userId,
      },
      role.version,
    )

    expect(suspendedRole.status).toBe('SUSPENDED')

    await expect(
      harness.manager.updateProviderService({
        actorUserId: userId,
        expectedVersion: service.version,
        serviceDescription: 'Published service',
        serviceId: service.id,
        serviceName: 'Published service',
        status: 'ACTIVE',
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)
  })

  it('rebuilds provider trust projection deterministically', async () => {
    const harness = createHarness([createUserId('241')])
    const userId = createUserId('041')

    await harness.users.create({ id: userId })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: userId,
      id: createUserId('141'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    const profile = await harness.manager.createProviderProfile({
      actorUserId: userId,
      publicName: 'Trust Lab',
      serviceRegion: 'Bangkok',
      status: 'ACTIVE',
    })

    const completedJobs = [
      Object.freeze({
        completedAt: parseUtcTimestamp('2026-06-25T09:00:00.000Z'),
        dueAt: parseUtcTimestamp('2026-06-25T12:00:00.000Z'),
        orderId: createUserId('501'),
        ratingScore: 5,
      }),
      Object.freeze({
        completedAt: parseUtcTimestamp('2026-06-26T14:00:00.000Z'),
        dueAt: parseUtcTimestamp('2026-06-26T13:00:00.000Z'),
        orderId: createUserId('502'),
        ratingScore: 3,
      }),
      Object.freeze({
        completedAt: parseUtcTimestamp('2026-06-27T16:00:00.000Z'),
        dueAt: null,
        orderId: createUserId('503'),
        ratingScore: null,
      }),
    ] as const

    const first = await harness.manager.rebuildProviderTrustProjection({
      actorUserId: userId,
      completedJobs,
      providerProfileId: profile.id,
      sponsored: true,
    })
    const second = await harness.manager.rebuildProviderTrustProjection({
      actorUserId: userId,
      completedJobs: [...completedJobs].reverse(),
      providerProfileId: profile.id,
      sponsored: true,
    })

    expect(first).toEqual({
      completedJobsCount: 3,
      lowSampleSize: true,
      onTimeRatePercent: 67,
      ratingAverage: 4,
      ratingCount: 2,
      sponsored: true,
    })
    expect(second).toEqual(first)
  })

  it('builds instant-print public cards from trust projection without exposing private setup fields', async () => {
    const harness = createHarness([
      createUserId('251'),
      createUserId('252'),
      createUserId('253'),
    ])
    const userId = createUserId('051')

    await harness.users.create({ id: userId })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: userId,
      id: createUserId('151'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    const profile = await harness.manager.createProviderProfile({
      actorUserId: userId,
      publicName: 'Verified Print Hub',
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
      quantityGrams: 2000,
      stockStatus: 'IN_STOCK',
    })
    await harness.services.repository.create({
      instantOrderEnabled: true,
      leadTimeDays: 2,
      providerProfileId: profile.id,
      serviceDescription: 'Fast FDM printing',
      serviceName: 'Fast Print',
      serviceRegion: 'Bangkok',
      serviceType: 'PRINT_ONLY',
      status: 'ACTIVE',
    })
    await harness.verificationCases.create({
      createdBy: userId,
      decisionReason: 'Approved provider verification',
      documents: [],
      id: createUserId('254'),
      requestedRoleCode: 'PRINT_PROVIDER',
      reviewerUserId: createUserId('255'),
      status: 'APPROVED',
      subjectId: userId,
      subjectType: 'USER',
      type: 'ROLE_KYC',
      updatedBy: userId,
    })
    await harness.manager.rebuildProviderTrustProjection({
      actorUserId: userId,
      completedJobs: [
        Object.freeze({
          completedAt: parseUtcTimestamp('2026-06-26T12:00:00.000Z'),
          dueAt: parseUtcTimestamp('2026-06-26T18:00:00.000Z'),
          orderId: createUserId('551'),
          ratingScore: 5,
        }),
      ],
      providerProfileId: profile.id,
    })

    const card = await harness.manager.getPublicProviderCard({
      profileId: profile.id,
    })

    expect(card).toMatchObject({
      approvedBadge: true,
      leadTimeDaysMin: 2,
      lowSampleSize: true,
      onTimeRatePercent: 100,
      publicName: 'Verified Print Hub',
      ratingAverage: 5,
      ratingCount: 1,
      serviceRegion: 'Bangkok',
      serviceTypes: ['PRINT_ONLY'],
      sponsored: false,
      status: 'ACTIVE',
    })
    expect(JSON.stringify(card)).not.toContain('ownerUserId')
    expect(JSON.stringify(card)).not.toContain('quantityGrams')
    expect(JSON.stringify(card)).not.toContain('printerId')
  })

  it('throws a not found error for missing profiles', async () => {
    const harness = createHarness()
    const userId = createUserId('061')

    await harness.users.create({ id: userId })
    await harness.roles.create({
      activatedAt: harness.clock.now(),
      createdBy: userId,
      id: createUserId('161'),
      roleCode: 'DESIGN_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: userId,
      userId,
    })

    await expect(
      harness.manager.getProviderProfile({
        actorUserId: userId,
        profileId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fdead'),
      }),
    ).rejects.toBeInstanceOf(ProviderNotFoundError)
  })
})
