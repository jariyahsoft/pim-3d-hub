import { describe, expect, test } from 'vitest'
import {
  createJobDiscoveryService,
  AuthorizationDeniedError,
  JobDiscoveryNotFoundError,
} from '@pim/application'
import {
  createMoneyMinor,
  parseUtcTimestamp,
  type ServiceRequestRecord,
} from '@pim/domain'
import {
  createInMemoryJobDiscoveryRepository,
  createFakeClock,
  createFakeUuidGenerator,
  createInMemoryFileAssetAccessGrantRepository,
  createInMemoryProviderProfileRepository,
  createInMemoryUserRoleRepository,
} from '@pim/testkit'

const nowTimestamp = parseUtcTimestamp('2026-06-28T13:00:00.000Z')
const futureTimestamp = parseUtcTimestamp('2026-07-10T13:00:00.000Z')

function createBaseServiceRequest(
  overrides: Partial<ServiceRequestRecord> = {},
): ServiceRequestRecord {
  return Object.freeze({
    id: '01912345-0000-7000-8000-000000000001' as any,
    schemaVersion: 1,
    version: 1,
    createdAt: nowTimestamp,
    updatedAt: nowTimestamp,
    deletedAt: null,
    createdBy: '01912345-0000-7000-8000-000000000010' as any,
    updatedBy: null,
    attachments: [],
    budget: createMoneyMinor(50000, 'THB'),
    buyerUserId: '01912345-0000-7000-8000-000000000010' as any,
    category: 'figurine',
    closedAt: null,
    description: 'Test job description',
    dueAt: futureTimestamp,
    objective: 'Print figurine',
    organizationId: null,
    prohibitedWorkAcknowledged: true,
    publishedAt: nowTimestamp,
    quantity: 5,
    serviceRegion: 'TH-10',
    serviceType: 'PRINT_ONLY' as any,
    status: 'PUBLISHED' as any,
    statusHistory: [],
    title: 'Test Job',
    visibility: 'PUBLIC' as any,
    ...overrides,
  })
}

describe('JobDiscoveryService', () => {
  test('discoverJobs returns public published jobs for active provider', async () => {
    const clock = createFakeClock(nowTimestamp)
    const uuidGenerator = createFakeUuidGenerator()
    const grantRepository = createInMemoryFileAssetAccessGrantRepository({ clock, uuidGenerator })
    const providerProfileRepository = createInMemoryProviderProfileRepository({ clock, uuidGenerator })
    const userRoleRepository = createInMemoryUserRoleRepository({ clock, uuidGenerator })

    const providerId = uuidGenerator.generate()
    await userRoleRepository.repository.create({
      userId: providerId,
      roleCode: 'DESIGN_PROVIDER',
      scopeType: 'GLOBAL',
      scopeId: null,
      status: 'ACTIVE',
      createdBy: providerId,
    })

    const jobs = [
      createBaseServiceRequest({ id: uuidGenerator.generate() }),
      createBaseServiceRequest({
        id: uuidGenerator.generate(),
        serviceType: 'DESIGN_AND_PRINT' as any,
      }),
    ]

    const jobDiscoveryRepository = createInMemoryJobDiscoveryRepository(jobs)

    const service = createJobDiscoveryService({
      clock,
      grantRepository: grantRepository.repository,
      jobDiscoveryRepository,
      providerProfileRepository: providerProfileRepository.repository,
      userRoleRepository: userRoleRepository.repository,
    })

    const result = await service.discoverJobs({
      actorUserId: providerId,
    })

    expect(result.items).toHaveLength(2)
    expect(result.items[0]?.title).toBe('Test Job')
    expect(result.items[0]?.status).toBe('PUBLISHED')
  })

  test('discoverJobs rejects non-provider user', async () => {
    const clock = createFakeClock(nowTimestamp)
    const uuidGenerator = createFakeUuidGenerator()
    const grantRepository = createInMemoryFileAssetAccessGrantRepository({ clock, uuidGenerator })
    const providerProfileRepository = createInMemoryProviderProfileRepository({ clock, uuidGenerator })
    const userRoleRepository = createInMemoryUserRoleRepository({ clock, uuidGenerator })

    const jobs = [createBaseServiceRequest()]
    const jobDiscoveryRepository = createInMemoryJobDiscoveryRepository(jobs)

    const service = createJobDiscoveryService({
      clock,
      grantRepository: grantRepository.repository,
      jobDiscoveryRepository,
      providerProfileRepository: providerProfileRepository.repository,
      userRoleRepository: userRoleRepository.repository,
    })

    const nonProviderId = uuidGenerator.generate()

    await expect(
      service.discoverJobs({ actorUserId: nonProviderId }),
    ).rejects.toThrow(AuthorizationDeniedError)
  })

  test('discoverJobs filters by serviceType', async () => {
    const clock = createFakeClock(nowTimestamp)
    const uuidGenerator = createFakeUuidGenerator()
    const grantRepository = createInMemoryFileAssetAccessGrantRepository({ clock, uuidGenerator })
    const providerProfileRepository = createInMemoryProviderProfileRepository({ clock, uuidGenerator })
    const userRoleRepository = createInMemoryUserRoleRepository({ clock, uuidGenerator })

    const providerId = uuidGenerator.generate()
    await userRoleRepository.repository.create({
      userId: providerId,
      roleCode: 'DESIGN_PROVIDER',
      scopeType: 'GLOBAL',
      scopeId: null,
      status: 'ACTIVE',
      createdBy: providerId,
    })

    const jobs = [
      createBaseServiceRequest({ id: uuidGenerator.generate(), serviceType: 'PRINT_ONLY' as any }),
      createBaseServiceRequest({ id: uuidGenerator.generate(), serviceType: 'DESIGN_ONLY' as any }),
    ]

    const jobDiscoveryRepository = createInMemoryJobDiscoveryRepository(jobs)

    const service = createJobDiscoveryService({
      clock,
      grantRepository: grantRepository.repository,
      jobDiscoveryRepository,
      providerProfileRepository: providerProfileRepository.repository,
      userRoleRepository: userRoleRepository.repository,
    })

    const result = await service.discoverJobs({
      actorUserId: providerId,
      serviceType: 'DESIGN_ONLY' as any,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.serviceType).toBe('DESIGN_ONLY')
  })

  test('getJobDetail returns job for owner', async () => {
    const clock = createFakeClock(nowTimestamp)
    const uuidGenerator = createFakeUuidGenerator()
    const grantRepository = createInMemoryFileAssetAccessGrantRepository({ clock, uuidGenerator })
    const providerProfileRepository = createInMemoryProviderProfileRepository({ clock, uuidGenerator })
    const userRoleRepository = createInMemoryUserRoleRepository({ clock, uuidGenerator })

    const buyerId = uuidGenerator.generate()
    const jobId = uuidGenerator.generate()
    const jobs = [
      createBaseServiceRequest({
        id: jobId,
        buyerUserId: buyerId,
        visibility: 'PRIVATE_DIRECT' as any,
      }),
    ]

    const jobDiscoveryRepository = createInMemoryJobDiscoveryRepository(jobs)

    const service = createJobDiscoveryService({
      clock,
      grantRepository: grantRepository.repository,
      jobDiscoveryRepository,
      providerProfileRepository: providerProfileRepository.repository,
      userRoleRepository: userRoleRepository.repository,
    })

    const result = await service.getJobDetail({
      actorUserId: buyerId,
      jobId,
    })

    expect(result.id).toBe(jobId)
    expect(result.title).toBe('Test Job')
  })

  test('getJobDetail denies unauthorized access to invite-only job', async () => {
    const clock = createFakeClock(nowTimestamp)
    const uuidGenerator = createFakeUuidGenerator()
    const grantRepository = createInMemoryFileAssetAccessGrantRepository({ clock, uuidGenerator })
    const providerProfileRepository = createInMemoryProviderProfileRepository({ clock, uuidGenerator })
    const userRoleRepository = createInMemoryUserRoleRepository({ clock, uuidGenerator })

    const buyerId = uuidGenerator.generate()
    const providerId = uuidGenerator.generate()
    const jobId = uuidGenerator.generate()

    const jobs = [
      createBaseServiceRequest({
        id: jobId,
        buyerUserId: buyerId,
        visibility: 'INVITE_ONLY' as any,
      }),
    ]

    const jobDiscoveryRepository = createInMemoryJobDiscoveryRepository(jobs)

    const service = createJobDiscoveryService({
      clock,
      grantRepository: grantRepository.repository,
      jobDiscoveryRepository,
      providerProfileRepository: providerProfileRepository.repository,
      userRoleRepository: userRoleRepository.repository,
    })

    await expect(
      service.getJobDetail({
        actorUserId: providerId,
        jobId,
      }),
    ).rejects.toThrow(AuthorizationDeniedError)
  })

  test('getJobDetail throws not found for missing job', async () => {
    const clock = createFakeClock(nowTimestamp)
    const uuidGenerator = createFakeUuidGenerator()
    const grantRepository = createInMemoryFileAssetAccessGrantRepository({ clock, uuidGenerator })
    const providerProfileRepository = createInMemoryProviderProfileRepository({ clock, uuidGenerator })
    const userRoleRepository = createInMemoryUserRoleRepository({ clock, uuidGenerator })

    const jobDiscoveryRepository = createInMemoryJobDiscoveryRepository([])

    const service = createJobDiscoveryService({
      clock,
      grantRepository: grantRepository.repository,
      jobDiscoveryRepository,
      providerProfileRepository: providerProfileRepository.repository,
      userRoleRepository: userRoleRepository.repository,
    })

    const providerId = uuidGenerator.generate()
    const missingJobId = uuidGenerator.generate()

    await expect(
      service.getJobDetail({
        actorUserId: providerId,
        jobId: missingJobId,
      }),
    ).rejects.toThrow(JobDiscoveryNotFoundError)
  })
})
