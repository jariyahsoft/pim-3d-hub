import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import type { CapacityWorkspaceDto } from '@pim/application'

function createCapacityId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`)
}

export function createEmptyCapacityWorkspace(): CapacityWorkspaceDto {
  return Object.freeze({
    closures: [],
    profile: Object.freeze({
      id: createCapacityId('801'),
      publicName: 'Printer Hub',
      serviceRegion: 'กรุงเทพมหานคร',
      status: 'ACTIVE',
      version: 1,
    }),
    reservations: [],
    slots: [],
  })
}

export const demoCapacityWorkspace: CapacityWorkspaceDto = Object.freeze({
  closures: [
    Object.freeze({
      endsAt: parseUtcTimestamp('2026-07-02T18:00:00.000Z'),
      id: createCapacityId('808'),
      printerId: createCapacityId('802'),
      providerProfileId: createCapacityId('801'),
      reason: 'Maintenance window',
      releasedAt: null,
      slotId: createCapacityId('805'),
      startsAt: parseUtcTimestamp('2026-07-02T09:00:00.000Z'),
      status: 'ACTIVE',
      version: 1,
    }),
  ],
  profile: Object.freeze({
    id: createCapacityId('801'),
    publicName: 'Bangkok Print Ops',
    serviceRegion: 'กรุงเทพมหานคร',
    status: 'ACTIVE',
    version: 4,
  }),
  reservations: [
    Object.freeze({
      expiresAt: parseUtcTimestamp('2026-07-01T09:30:00.000Z'),
      id: createCapacityId('806'),
      printerId: createCapacityId('802'),
      providerProfileId: createCapacityId('801'),
      providerServiceId: createCapacityId('803'),
      releaseReason: null,
      releasedAt: null,
      slotId: createCapacityId('804'),
      status: 'ACTIVE',
      units: 1,
      version: 1,
    }),
    Object.freeze({
      expiresAt: parseUtcTimestamp('2026-07-02T10:00:00.000Z'),
      id: createCapacityId('807'),
      printerId: createCapacityId('802'),
      providerProfileId: createCapacityId('801'),
      providerServiceId: createCapacityId('803'),
      releaseReason: 'EXPIRED',
      releasedAt: parseUtcTimestamp('2026-07-02T10:05:00.000Z'),
      slotId: createCapacityId('805'),
      status: 'EXPIRED',
      units: 1,
      version: 2,
    }),
  ],
  slots: [
    Object.freeze({
      endsAt: parseUtcTimestamp('2026-07-01T18:00:00.000Z'),
      id: createCapacityId('804'),
      printerId: createCapacityId('802'),
      providerProfileId: createCapacityId('801'),
      reservedUnits: 1,
      startsAt: parseUtcTimestamp('2026-07-01T09:00:00.000Z'),
      status: 'OPEN',
      totalUnits: 3,
      version: 2,
    }),
    Object.freeze({
      endsAt: parseUtcTimestamp('2026-07-02T18:00:00.000Z'),
      id: createCapacityId('805'),
      printerId: createCapacityId('802'),
      providerProfileId: createCapacityId('801'),
      reservedUnits: 1,
      startsAt: parseUtcTimestamp('2026-07-02T09:00:00.000Z'),
      status: 'CLOSED',
      totalUnits: 2,
      version: 3,
    }),
  ],
})
