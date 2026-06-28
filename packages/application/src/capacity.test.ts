import { describe, expect, it } from 'vitest'
import { createCapacityService } from './capacity.js'
import { parseDimensionsMm, parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import {
  createInMemoryCapacityRepository,
  createInMemoryPrinterRepository,
  createInMemoryProviderProfileRepository,
  createInMemoryProviderServiceRepository,
  createFakeClock,
  createFakeUuidGenerator,
} from '../../testkit/src/index.js'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
} from '../../infrastructure/src/index.js'

function createUserId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`)
}

describe('capacity service', () => {
  it('reserves once per idempotency key and expires reservations exactly once', async () => {
    const clock = createFakeClock('2026-06-28T10:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const services = createInMemoryProviderServiceRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capacity = createInMemoryCapacityRepository({ clock })
    const ownerId = createUserId('901')
    const buyerId = createUserId('902')

    await users.create({ id: ownerId })
    await users.create({ id: buyerId })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: ownerId,
      id: createUserId('903'),
      roleCode: 'FULL_SERVICE_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: ownerId,
      userId: ownerId,
    })

    const service = createCapacityService({
      capacityRepository: capacity.repository,
      clock,
      printers: printers.repository,
      providerProfiles: profiles.repository,
      providerServices: services.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator([
        createUserId('904'),
        createUserId('905'),
        createUserId('906'),
        createUserId('907'),
      ]),
    })

    const profile = await profiles.repository.create({
      ownerUserId: ownerId,
      publicName: 'Capacity Hub',
      serviceRegion: 'Bangkok',
      status: 'ACTIVE',
    })
    const providerService = await services.repository.create({
      leadTimeDays: 3,
      providerProfileId: profile.id,
      serviceDescription: 'Fast print queue',
      serviceName: 'Print queue',
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

    const slot = await service.createCapacitySlot({
      actorUserId: ownerId,
      endsAt: parseUtcTimestamp('2026-06-29T18:00:00.000Z'),
      printerId: printer.id,
      providerProfileId: profile.id,
      startsAt: parseUtcTimestamp('2026-06-29T09:00:00.000Z'),
      totalUnits: 2,
    })

    const firstReservation = await service.reserveCapacity({
      actorUserId: buyerId,
      expiresAt: parseUtcTimestamp('2026-06-28T10:30:00.000Z'),
      idempotencyKey: 'hold-1',
      providerServiceId: providerService.id,
      slotId: slot.id,
      units: 1,
    })
    const secondReservation = await service.reserveCapacity({
      actorUserId: buyerId,
      expiresAt: parseUtcTimestamp('2026-06-28T10:30:00.000Z'),
      idempotencyKey: 'hold-1',
      providerServiceId: providerService.id,
      slotId: slot.id,
      units: 1,
    })

    expect(secondReservation.id).toBe(firstReservation.id)

    const workspaceBeforeExpiry = await service.getCapacityWorkspace({
      actorUserId: ownerId,
      providerProfileId: profile.id,
    })
    expect(workspaceBeforeExpiry.slots[0]).toMatchObject({
      reservedUnits: 1,
      totalUnits: 2,
    })
    expect(JSON.stringify(workspaceBeforeExpiry)).not.toContain('reservedByUserId')

    clock.set('2026-06-28T11:00:00.000Z')
    const firstExpiryRun = await service.releaseExpiredReservations()
    const secondExpiryRun = await service.releaseExpiredReservations()

    expect(firstExpiryRun.released).toHaveLength(1)
    expect(firstExpiryRun.released[0]).toMatchObject({
      id: firstReservation.id,
      status: 'EXPIRED',
    })
    expect(secondExpiryRun.released).toHaveLength(0)

    const workspaceAfterExpiry = await service.getCapacityWorkspace({
      actorUserId: ownerId,
      providerProfileId: profile.id,
    })
    expect(workspaceAfterExpiry.slots[0]?.reservedUnits).toBe(0)
  })

  it('rejects reservations for closed slots with a stable capacity error', async () => {
    const clock = createFakeClock('2026-06-28T10:00:00.000Z')
    const users = createInMemoryUserRepository({ clock })
    const roles = createInMemoryUserRoleRepository({ clock })
    const profiles = createInMemoryProviderProfileRepository({ clock })
    const services = createInMemoryProviderServiceRepository({ clock })
    const printers = createInMemoryPrinterRepository({ clock })
    const capacity = createInMemoryCapacityRepository({ clock })
    const ownerId = createUserId('911')
    const buyerId = createUserId('912')

    await users.create({ id: ownerId })
    await users.create({ id: buyerId })
    await roles.create({
      activatedAt: clock.now(),
      createdBy: ownerId,
      id: createUserId('913'),
      roleCode: 'PRINT_PROVIDER',
      scopeType: 'GLOBAL',
      status: 'ACTIVE',
      updatedBy: ownerId,
      userId: ownerId,
    })

    const service = createCapacityService({
      capacityRepository: capacity.repository,
      clock,
      printers: printers.repository,
      providerProfiles: profiles.repository,
      providerServices: services.repository,
      userRoles: roles,
      users,
      uuidGenerator: createFakeUuidGenerator([
        createUserId('914'),
        createUserId('915'),
        createUserId('916'),
      ]),
    })

    const profile = await profiles.repository.create({
      ownerUserId: ownerId,
      publicName: 'Closed Day Lab',
      serviceRegion: 'Bangkok',
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

    const slot = await service.createCapacitySlot({
      actorUserId: ownerId,
      endsAt: parseUtcTimestamp('2026-06-30T18:00:00.000Z'),
      printerId: printer.id,
      providerProfileId: profile.id,
      startsAt: parseUtcTimestamp('2026-06-30T09:00:00.000Z'),
      totalUnits: 1,
    })

    const closed = await service.closeCapacitySlot({
      actorUserId: ownerId,
      expectedVersion: slot.version,
      reason: 'Maintenance',
      slotId: slot.id,
    })

    await expect(
      service.reserveCapacity({
        actorUserId: buyerId,
        expiresAt: parseUtcTimestamp('2026-06-28T10:30:00.000Z'),
        idempotencyKey: 'closed-slot',
        providerServiceId: providerService.id,
        slotId: closed.slot.id,
        units: 1,
      }),
    ).rejects.toMatchObject({
      code: 'CAPACITY_UNAVAILABLE',
      fields: ['slotId'],
    })
  })
})
