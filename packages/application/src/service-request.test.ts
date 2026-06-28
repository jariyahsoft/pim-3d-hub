import { describe, expect, it } from 'vitest'
import {
  createServiceRequestService,
  InvalidServiceRequestStateError,
  ServiceRequestNotFoundError,
} from './service-request.js'
import { AuthorizationDeniedError } from './identity.js'
import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
} from '../../infrastructure/src/index.js'
import {
  createFakeClock,
  createFakeUuidGenerator,
  createInMemoryServiceRequestRepository,
} from '../../testkit/src/index.js'

function createUserId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`)
}

function createHarness(uuidIds: readonly string[] = []) {
  const clock = createFakeClock('2026-06-28T10:00:00.000Z')
  const users = createInMemoryUserRepository({ clock })
  const userRoles = createInMemoryUserRoleRepository({ clock })
  const serviceRequests = createInMemoryServiceRequestRepository({ clock })

  const service = createServiceRequestService({
    clock,
    serviceRequests: serviceRequests.repository,
    userRoles,
    users,
    uuidGenerator: createFakeUuidGenerator(uuidIds),
  })

  return { clock, service, serviceRequests, userRoles, users }
}

describe('service request service', () => {
  it('lets a buyer save and resume a draft', async () => {
    const harness = createHarness([createUserId('201')])
    const buyerId = createUserId('001')

    await harness.users.create({ id: buyerId })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: buyerId,
      id: createUserId('101'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: buyerId,
      userId: buyerId,
    })

    const created = await harness.service.createDraft({
      actorUserId: buyerId,
      serviceType: 'DESIGN_ONLY',
      title: 'Mascot redesign',
      visibility: 'PRIVATE_DIRECT',
    })

    const updated = await harness.service.updateDraft({
      actorUserId: buyerId,
      budgetCurrency: 'THB',
      budgetMinor: 4500,
      description: 'Need help refining an STL-ready concept',
      dueAt: parseUtcTimestamp('2026-07-03T10:00:00.000Z'),
      expectedVersion: created.version,
      prohibitedWorkAcknowledged: true,
      requestId: created.id,
      serviceRegion: 'กรุงเทพมหานคร',
      title: 'Mascot redesign with STL prep',
    })
    const resumed = await harness.service.getRequest({
      actorUserId: buyerId,
      requestId: created.id,
    })

    expect(created.status).toBe('DRAFT')
    expect(updated.title).toBe('Mascot redesign with STL prep')
    expect(updated.budget).toEqual({
      currency: 'THB',
      minorUnits: 4500,
    })
    expect(updated.version).toBe(2)
    expect(resumed).toEqual(updated)
  })

  it('blocks editing once a request has been published', async () => {
    const harness = createHarness([createUserId('202')])
    const buyerId = createUserId('002')

    await harness.users.create({ id: buyerId })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: buyerId,
      id: createUserId('102'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: buyerId,
      userId: buyerId,
    })

    const created = await harness.service.createDraft({
      actorUserId: buyerId,
      budgetCurrency: 'THB',
      budgetMinor: 9000,
      description: 'Need design and print help',
      dueAt: parseUtcTimestamp('2026-07-02T10:00:00.000Z'),
      prohibitedWorkAcknowledged: true,
      serviceRegion: 'เชียงใหม่',
      serviceType: 'DESIGN_AND_PRINT',
      title: 'Prototype housing',
      visibility: 'PUBLIC',
    })

    const published = await harness.service.publishRequest({
      actorUserId: buyerId,
      expectedVersion: created.version,
      requestId: created.id,
    })

    await expect(
      harness.service.updateDraft({
        actorUserId: buyerId,
        description: 'Updated after publish',
        expectedVersion: published.version,
        requestId: published.id,
      }),
    ).rejects.toBeInstanceOf(InvalidServiceRequestStateError)
  })

  it('rejects incomplete or invalid publish inputs', async () => {
    const harness = createHarness([createUserId('203')])
    const buyerId = createUserId('003')

    await harness.users.create({ id: buyerId })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: buyerId,
      id: createUserId('103'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: buyerId,
      userId: buyerId,
    })

    await expect(
      harness.service.createDraft({
        actorUserId: buyerId,
        dueAt: parseUtcTimestamp('2026-06-28T09:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: ['dueAt'],
    })

    const draft = await harness.service.createDraft({
      actorUserId: buyerId,
      serviceType: 'PRINT_ONLY',
      title: 'Only a title',
      visibility: 'PUBLIC',
    })

    await expect(
      harness.service.publishRequest({
        actorUserId: buyerId,
        expectedVersion: draft.version,
        requestId: draft.id,
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: expect.arrayContaining([
        'description',
        'dueAt',
        'budgetMinor',
        'budgetCurrency',
        'prohibitedWorkAcknowledged',
      ]),
    })
  })

  it('prevents unauthorized users from reading a private request', async () => {
    const harness = createHarness([createUserId('204')])
    const ownerId = createUserId('004')
    const otherId = createUserId('005')

    await harness.users.create({ id: ownerId })
    await harness.users.create({ id: otherId })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: ownerId,
      id: createUserId('104'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: ownerId,
      userId: ownerId,
    })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: otherId,
      id: createUserId('105'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: otherId,
      userId: otherId,
    })

    const draft = await harness.service.createDraft({
      actorUserId: ownerId,
      budgetCurrency: 'THB',
      budgetMinor: 8000,
      description: 'Private concept model',
      dueAt: parseUtcTimestamp('2026-07-01T10:00:00.000Z'),
      prohibitedWorkAcknowledged: true,
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_ONLY',
      title: 'Confidential figurine',
      visibility: 'PRIVATE_DIRECT',
    })

    await expect(
      harness.service.getRequest({
        actorUserId: otherId,
        requestId: draft.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)
  })

  it('throws not found for a missing request id', async () => {
    const harness = createHarness()
    const buyerId = createUserId('006')

    await harness.users.create({ id: buyerId })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: buyerId,
      id: createUserId('106'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: buyerId,
      userId: buyerId,
    })

    await expect(
      harness.service.getRequest({
        actorUserId: buyerId,
        requestId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fdead'),
      }),
    ).rejects.toBeInstanceOf(ServiceRequestNotFoundError)
  })
})
