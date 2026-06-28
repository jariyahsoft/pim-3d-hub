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
import { createJobDiscoveryController } from './job-discovery.js'

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

describe('JobDiscoveryController', () => {
  test('discoverJobs returns 200 with job list', async () => {
    const clock = createFakeClock(nowTimestamp)
    const uuidGenerator = createFakeUuidGenerator()
    const grantRepository = createInMemoryFileAssetAccessGrantRepository({ clock, uuidGenerator })
    const providerProfileRepository = createInMemoryProviderProfileRepository({ clock, uuidGenerator })
    const userRoleRepository = createInMemoryUserRoleRepository({ clock, uuidGenerator })

    const providerId = uuidGenerator.generate()
    await userRoleRepository.repository.create({
      userId: providerId,
      roleCode: 'PROVIDER',
      scopeType: 'GLOBAL',
      scopeId: null,
      status: 'ACTIVE',
      createdBy: providerId,
    })

    const jobs = [
      createBaseServiceRequest({ id: uuidGenerator.generate() }),
      createBaseServiceRequest({ id: uuidGenerator.generate(), title: 'Second Job' }),
    ]

    const jobDiscoveryRepository = createInMemoryJobDiscoveryRepository(jobs)

    const service = createJobDiscoveryService({
      clock,
      grantRepository: grantRepository.repository,
      jobDiscoveryRepository,
      providerProfileRepository: providerProfileRepository.repository,
      userRoleRepository: userRoleRepository.repository,
    })

    const controller = createJobDiscoveryController(service)

    const ctx = {
      userId: providerId,
      requestId: 'req_test' as any,
      traceId: 'trace_test',
    }

    const result = await controller.discoverJobs(ctx, {})

    expect(result.status).toBe(200)
    expect(result.body.items).toHaveLength(2)
    expect(result.body.items[0].title).toBe('Test Job')
  })

  test('getJobDetail returns 200 with job detail', async () => {
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
        title: 'Specific Job',
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

    const controller = createJobDiscoveryController(service)

    const ctx = {
      userId: buyerId,
      requestId: 'req_test' as any,
      traceId: 'trace_test',
    }

    const result = await controller.getJobDetail(ctx, jobId)

    expect(result.status).toBe(200)
    expect(result.body.id).toBe(jobId)
    expect(result.body.title).toBe('Specific Job')
  })

  test('discoverJobs throws when user is not a provider', async () => {
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

    const controller = createJobDiscoveryController(service)

    const nonProviderId = uuidGenerator.generate()
    const ctx = {
      userId: nonProviderId,
      requestId: 'req_test' as any,
      traceId: 'trace_test',
    }

    await expect(controller.discoverJobs(ctx, {})).rejects.toThrow(AuthorizationDeniedError)
  })
})
