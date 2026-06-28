import { Firestore } from '@google-cloud/firestore'
import { createCapacityService } from '@pim/application'
import { parseDimensionsMm, parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import { describe, expect, it } from 'vitest'
import {
  createInMemoryPrinterRepository,
  createInMemoryProviderProfileRepository,
  createInMemoryProviderServiceRepository,
  createFakeClock,
} from '../../testkit/src/index.js'
import { createFirestoreCapacityRepository } from './firestore-capacity-repository.js'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
} from './in-memory-user-repositories.js'

const projectId = 'demo-pim-3d-hub-local'
const firestore = new Firestore({ projectId })
let collectionCounter = 0

function nextCollectionPrefix(scope: string): string {
  collectionCounter += 1
  return `${scope}_${String(collectionCounter).padStart(4, '0')}`
}

function createSequentialUuidGenerator(start = 1) {
  let counter = start

  return Object.freeze({
    next() {
      const value = parseUuidv7(
        `018f18b2-4c4f-7c7a-9e12-${String(counter).padStart(12, '0')}`,
      )
      counter += 1
      return value
    },
  })
}

async function createScenario(scope: string) {
  const clock = createFakeClock('2026-06-28T10:00:00.000Z')
  const users = createInMemoryUserRepository({ clock })
  const userRoles = createInMemoryUserRoleRepository({ clock })
  const providerProfiles = createInMemoryProviderProfileRepository({ clock })
  const providerServices = createInMemoryProviderServiceRepository({ clock })
  const printers = createInMemoryPrinterRepository({ clock })
  const uuidGenerator = createSequentialUuidGenerator(100)
  const capacityRepository = createFirestoreCapacityRepository({
    clock,
    collectionPrefix: nextCollectionPrefix(scope),
    firestore,
    uuidGenerator,
  })
  const capacityService = createCapacityService({
    capacityRepository,
    clock,
    printers: printers.repository,
    providerProfiles: providerProfiles.repository,
    providerServices: providerServices.repository,
    userRoles,
    users,
    uuidGenerator,
  })

  const ownerId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000011')
  const buyerIds = [
    parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000021'),
    parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000022'),
    parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000023'),
    parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000024'),
  ] as const

  await users.create({ id: ownerId })
  for (const buyerId of buyerIds) {
    await users.create({ id: buyerId })
  }

  await userRoles.create({
    activatedAt: clock.now(),
    createdBy: ownerId,
    id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000031'),
    roleCode: 'FULL_SERVICE_PROVIDER',
    scopeType: 'GLOBAL',
    status: 'ACTIVE',
    updatedBy: ownerId,
    userId: ownerId,
  })

  const profile = await providerProfiles.repository.create({
    ownerUserId: ownerId,
    publicName: 'Firestore Capacity Hub',
    serviceRegion: 'Bangkok',
    status: 'ACTIVE',
  })
  const providerService = await providerServices.repository.create({
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

  return {
    buyerIds,
    capacityRepository,
    capacityService,
    clock,
    ownerId,
    printer,
    profile,
    providerService,
  }
}

describe('CapacityRepository Firestore adapter', () => {
  it('never oversubscribes under concurrent reservations', async () => {
    const scenario = await createScenario('capacity_concurrency')
    const slot = await scenario.capacityService.createCapacitySlot({
      actorUserId: scenario.ownerId,
      endsAt: parseUtcTimestamp('2026-06-29T18:00:00.000Z'),
      printerId: scenario.printer.id,
      providerProfileId: scenario.profile.id,
      startsAt: parseUtcTimestamp('2026-06-29T09:00:00.000Z'),
      totalUnits: 3,
    })

    const results = await Promise.allSettled(
      scenario.buyerIds.map((buyerId, index) =>
        scenario.capacityService.reserveCapacity({
          actorUserId: buyerId,
          expiresAt: parseUtcTimestamp('2026-06-28T10:45:00.000Z'),
          idempotencyKey: `reserve-${index + 1}`,
          providerServiceId: scenario.providerService.id,
          slotId: slot.id,
          units: 1,
        }),
      ),
    )

    const fulfilled = results.filter((result) => result.status === 'fulfilled')
    const rejected = results.filter((result) => result.status === 'rejected')

    expect(fulfilled).toHaveLength(3)
    expect(rejected).toHaveLength(1)
    expect(rejected[0]).toMatchObject({
      reason: {
        code: 'CAPACITY_UNAVAILABLE',
      },
    })

    const persistedSlot = await scenario.capacityRepository.findSlotById(slot.id)
    expect(persistedSlot?.reservedUnits).toBe(3)
  })

  it('treats the same idempotency key as one reservation and expires it once', async () => {
    const scenario = await createScenario('capacity_idempotency')
    const slot = await scenario.capacityService.createCapacitySlot({
      actorUserId: scenario.ownerId,
      endsAt: parseUtcTimestamp('2026-06-30T18:00:00.000Z'),
      printerId: scenario.printer.id,
      providerProfileId: scenario.profile.id,
      startsAt: parseUtcTimestamp('2026-06-30T09:00:00.000Z'),
      totalUnits: 2,
    })

    const [firstReservation, secondReservation] = await Promise.all([
      scenario.capacityService.reserveCapacity({
        actorUserId: scenario.buyerIds[0],
        expiresAt: parseUtcTimestamp('2026-06-28T10:15:00.000Z'),
        idempotencyKey: 'shared-key',
        providerServiceId: scenario.providerService.id,
        slotId: slot.id,
        units: 1,
      }),
      scenario.capacityService.reserveCapacity({
        actorUserId: scenario.buyerIds[0],
        expiresAt: parseUtcTimestamp('2026-06-28T10:15:00.000Z'),
        idempotencyKey: 'shared-key',
        providerServiceId: scenario.providerService.id,
        slotId: slot.id,
        units: 1,
      }),
    ])

    expect(firstReservation.id).toBe(secondReservation.id)

    const slotAfterReserve = await scenario.capacityRepository.findSlotById(slot.id)
    expect(slotAfterReserve?.reservedUnits).toBe(1)

    scenario.clock.set('2026-06-28T10:30:00.000Z')
    const firstExpiry = await scenario.capacityService.releaseExpiredReservations()
    const secondExpiry = await scenario.capacityService.releaseExpiredReservations()

    expect(firstExpiry.released).toHaveLength(1)
    expect(firstExpiry.released[0]?.status).toBe('EXPIRED')
    expect(secondExpiry.released).toHaveLength(0)

    const slotAfterExpiry = await scenario.capacityRepository.findSlotById(slot.id)
    expect(slotAfterExpiry?.reservedUnits).toBe(0)
  })

  it('rejects reservations for closed slots with CAPACITY_UNAVAILABLE', async () => {
    const scenario = await createScenario('capacity_closure')
    const slot = await scenario.capacityService.createCapacitySlot({
      actorUserId: scenario.ownerId,
      endsAt: parseUtcTimestamp('2026-07-01T18:00:00.000Z'),
      printerId: scenario.printer.id,
      providerProfileId: scenario.profile.id,
      startsAt: parseUtcTimestamp('2026-07-01T09:00:00.000Z'),
      totalUnits: 1,
    })

    const closed = await scenario.capacityService.closeCapacitySlot({
      actorUserId: scenario.ownerId,
      expectedVersion: slot.version,
      reason: 'Maintenance',
      slotId: slot.id,
    })

    await expect(
      scenario.capacityService.reserveCapacity({
        actorUserId: scenario.buyerIds[0],
        expiresAt: parseUtcTimestamp('2026-06-28T10:45:00.000Z'),
        idempotencyKey: 'closed-key',
        providerServiceId: scenario.providerService.id,
        slotId: closed.slot.id,
        units: 1,
      }),
    ).rejects.toMatchObject({
      code: 'CAPACITY_UNAVAILABLE',
      fields: ['slotId'],
    })
  })
})
