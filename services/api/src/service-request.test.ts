import { describe, expect, it } from 'vitest'
import {
  createServiceRequestService,
  createStructuredLogger,
  type ResolveAuthenticatedUserUseCase,
} from '@pim/application'
import { parseUtcTimestamp, parseUuidv7, type UserRecord } from '@pim/domain'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
} from '../../../packages/infrastructure/src/index.js'
import {
  createFakeClock,
  createFakeUuidGenerator,
  createInMemoryServiceRequestRepository,
} from '../../../packages/testkit/src/index.js'
import { createAuthenticationMiddleware } from './authentication.js'
import { createServiceRequestController } from './service-request.js'

function createUserRecord(id: string): UserRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
    createdBy: null,
    countryCode: 'TH',
    deletedAt: null,
    displayName: 'Somchai Buyer',
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

function createResolver(user: UserRecord): ResolveAuthenticatedUserUseCase {
  return Object.freeze({
    async execute() {
      return {
        externalIdentity: {
          email: 'buyer@example.com',
          emailVerified: true,
          provider: 'firebase' as const,
          providerSubject: `firebase-${user.id}`,
          safeClaims: Object.freeze({ role: 'buyer' }),
        },
        identity: Object.freeze({
          createdAt: user.createdAt,
          createdBy: null,
          deletedAt: null,
          emailNormalized: 'buyer@example.com',
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

  const controller = createServiceRequestController({
    authentication: createAuthenticationMiddleware({
      logger: createStructuredLogger({
        sink() {
          return undefined
        },
      }),
      resolver: createResolver(user),
    }),
    serviceRequests: service,
  })

  return {
    clock,
    controller,
    service,
    serviceRequests,
    userRoles,
    users,
  }
}

describe('service request API controller', () => {
  it('creates and resumes a buyer draft', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001')
    const harness = createHarness(user, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd201',
    ])

    await harness.users.create({ id: user.id })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd101'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const created = await harness.controller.createDraft({
      body: {
        serviceType: 'DESIGN_ONLY',
        title: 'Sketch to CAD',
        visibility: 'PRIVATE_DIRECT',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    expect(created.status).toBe(201)
    const createdId = (created.body as { data: { id: string } }).data.id

    const updated = await harness.controller.updateDraft({
      body: {
        budgetCurrency: 'THB',
        budgetMinor: 5000,
        description: 'Need a clean 3D model from concept art',
        dueAt: '2026-07-05T10:00:00.000Z',
        expectedVersion: 1,
        prohibitedWorkAcknowledged: true,
        serviceRegion: 'กรุงเทพมหานคร',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        requestId: createdId,
      },
    })
    const resumed = await harness.controller.getRequest({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        requestId: createdId,
      },
    })

    expect(updated.status).toBe(200)
    expect(resumed).toMatchObject({
      body: {
        data: {
          budget: {
            currency: 'THB',
            minorUnits: 5000,
          },
          description: 'Need a clean 3D model from concept art',
          status: 'DRAFT',
        },
      },
      status: 200,
    })
  })

  it('returns an invalid state error when editing after publish', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd011')
    const harness = createHarness(user, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd211',
    ])

    await harness.users.create({ id: user.id })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd111'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const created = await harness.service.createDraft({
      actorUserId: user.id,
      budgetCurrency: 'THB',
      budgetMinor: 12000,
      description: 'Need a design-and-print partner',
      dueAt: parseUtcTimestamp('2026-07-06T10:00:00.000Z'),
      prohibitedWorkAcknowledged: true,
      serviceRegion: 'Chiang Mai',
      serviceType: 'DESIGN_AND_PRINT',
      title: 'Prototype enclosure',
      visibility: 'PUBLIC',
    })
    const published = await harness.service.publishRequest({
      actorUserId: user.id,
      expectedVersion: created.version,
      requestId: created.id,
    })

    const result = await harness.controller.updateDraft({
      body: {
        description: 'late edit',
        expectedVersion: published.version,
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        requestId: published.id,
      },
    })

    expect(result).toMatchObject({
      body: {
        error: {
          code: 'INVALID_STATE_TRANSITION',
        },
      },
      status: 409,
    })
  })

  it('denies reads of another buyer private request', async () => {
    const owner = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd021')
    const other = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd022')
    const ownerHarness = createHarness(owner, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd221',
    ])
    const otherHarness = createHarness(other)

    await ownerHarness.users.create({ id: owner.id })
    await ownerHarness.users.create({ id: other.id })
    await ownerHarness.userRoles.create({
      activatedAt: ownerHarness.clock.now(),
      createdBy: owner.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd121'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: owner.id,
      userId: owner.id,
    })
    await ownerHarness.userRoles.create({
      activatedAt: ownerHarness.clock.now(),
      createdBy: other.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd122'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: other.id,
      userId: other.id,
    })

    const draft = await ownerHarness.service.createDraft({
      actorUserId: owner.id,
      budgetCurrency: 'THB',
      budgetMinor: 3000,
      description: 'Private buyer draft',
      dueAt: parseUtcTimestamp('2026-07-03T10:00:00.000Z'),
      prohibitedWorkAcknowledged: true,
      serviceRegion: 'Bangkok',
      serviceType: 'DESIGN_ONLY',
      title: 'Confidential logo stand',
      visibility: 'PRIVATE_DIRECT',
    })

    ;(otherHarness.users as typeof ownerHarness.users) // share repositories
    ;(otherHarness.userRoles as typeof ownerHarness.userRoles)

    const sharedController = createServiceRequestController({
      authentication: createAuthenticationMiddleware({
        logger: createStructuredLogger({
          sink() {
            return undefined
          },
        }),
        resolver: createResolver(other),
      }),
      serviceRequests: ownerHarness.service,
    })

    const result = await sharedController.getRequest({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        requestId: draft.id,
      },
    })

    expect(result).toMatchObject({
      body: {
        error: {
          code: 'AUTHORIZATION_DENIED',
        },
      },
      status: 403,
    })
  })

  it('validates due date inputs', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd031')
    const harness = createHarness(user, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd231',
    ])

    await harness.users.create({ id: user.id })
    await harness.userRoles.create({
      activatedAt: harness.clock.now(),
      createdBy: user.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd131'),
      roleCode: 'BUYER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: user.id,
      userId: user.id,
    })

    const result = await harness.controller.createDraft({
      body: {
        dueAt: '2026-06-28T09:00:00.000Z',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    })

    expect(result).toMatchObject({
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          fields: ['dueAt'],
        },
      },
      status: 400,
    })
  })
})
