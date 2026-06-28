import type { CanonicalRecord, RepositoryListPage, RepositoryListRequest } from './repository.js'
import type { UtcTimestamp, Uuidv7 } from './index.js'

export const capacitySlotStatuses = ['OPEN', 'PAUSED', 'CLOSED'] as const
export const capacityClosureStatuses = ['ACTIVE', 'RELEASED'] as const
export const capacityReservationStatuses = ['ACTIVE', 'RELEASED', 'EXPIRED'] as const
export const capacityReservationReleaseReasons = ['MANUAL', 'EXPIRED', 'CANCELLED'] as const

export type CapacitySlotStatus = (typeof capacitySlotStatuses)[number]
export type CapacityClosureStatus = (typeof capacityClosureStatuses)[number]
export type CapacityReservationStatus = (typeof capacityReservationStatuses)[number]
export type CapacityReservationReleaseReason =
  (typeof capacityReservationReleaseReasons)[number]

export type CapacitySlotSortField = 'createdAt' | 'startsAt' | 'updatedAt'
export type CapacityClosureSortField = 'createdAt' | 'startsAt' | 'updatedAt'
export type CapacityReservationSortField = 'createdAt' | 'expiresAt' | 'updatedAt'

export class CapacityUnavailableError extends Error {
  readonly code = 'CAPACITY_UNAVAILABLE'
  readonly fields: readonly string[]
  readonly status = 422

  constructor(message: string, fields: readonly string[] = []) {
    super(message)
    this.name = 'CapacityUnavailableError'
    this.fields = fields
  }
}

export class IdempotencyConflictError extends Error {
  readonly code = 'IDEMPOTENCY_CONFLICT'
  readonly fields: readonly string[]
  readonly status = 409

  constructor(message: string, fields: readonly string[] = ['idempotencyKey']) {
    super(message)
    this.name = 'IdempotencyConflictError'
    this.fields = fields
  }
}

export type CapacitySlotRecord = Readonly<
  CanonicalRecord & {
    endsAt: UtcTimestamp
    printerId: Uuidv7
    providerProfileId: Uuidv7
    reservedUnits: number
    startsAt: UtcTimestamp
    status: CapacitySlotStatus
    totalUnits: number
  }
>

export type CreateCapacitySlotInput = Readonly<{
  createdBy?: Uuidv7 | null
  endsAt: UtcTimestamp
  id?: Uuidv7
  printerId: Uuidv7
  providerProfileId: Uuidv7
  reservedUnits?: number
  startsAt: UtcTimestamp
  status?: CapacitySlotStatus
  totalUnits: number
  updatedBy?: Uuidv7 | null
}>

export type CapacitySlotFilter = Readonly<{
  printerId?: Uuidv7
  providerProfileId?: Uuidv7
  startsAtGte?: UtcTimestamp
  startsAtLte?: UtcTimestamp
  status?: CapacitySlotStatus
}>

export type CapacityClosureRecord = Readonly<
  CanonicalRecord & {
    endsAt: UtcTimestamp
    printerId: Uuidv7
    providerProfileId: Uuidv7
    reason: string | null
    releasedAt: UtcTimestamp | null
    reopenStatus: Exclude<CapacitySlotStatus, 'CLOSED'>
    slotId: Uuidv7
    startsAt: UtcTimestamp
    status: CapacityClosureStatus
  }
>

export type CapacityClosureFilter = Readonly<{
  printerId?: Uuidv7
  providerProfileId?: Uuidv7
  slotId?: Uuidv7
  status?: CapacityClosureStatus
}>

export type CapacityReservationRecord = Readonly<
  CanonicalRecord & {
    expiresAt: UtcTimestamp
    idempotencyKey: string
    printerId: Uuidv7
    providerProfileId: Uuidv7
    providerServiceId: Uuidv7
    releaseReason: CapacityReservationReleaseReason | null
    releasedAt: UtcTimestamp | null
    requestHash: string
    reservedByUserId: Uuidv7 | null
    slotId: Uuidv7
    status: CapacityReservationStatus
    units: number
  }
>

export type CapacityReservationFilter = Readonly<{
  expiresAtLte?: UtcTimestamp
  printerId?: Uuidv7
  providerProfileId?: Uuidv7
  reservedByUserId?: Uuidv7
  slotId?: Uuidv7
  status?: CapacityReservationStatus
}>

export type ReserveCapacityInput = Readonly<{
  createdBy?: Uuidv7 | null
  expiresAt: UtcTimestamp
  id?: Uuidv7
  idempotencyKey: string
  printerId: Uuidv7
  providerProfileId: Uuidv7
  providerServiceId: Uuidv7
  requestHash: string
  reservedByUserId: Uuidv7 | null
  slotId: Uuidv7
  units: number
  updatedBy?: Uuidv7 | null
}>

export type ReleaseCapacityReservationInput = Readonly<{
  actorUserId?: Uuidv7 | null
  reason: CapacityReservationReleaseReason
  reservationId: Uuidv7
}>

export type CloseCapacitySlotInput = Readonly<{
  actorUserId?: Uuidv7 | null
  reason?: string | null
  slotExpectedVersion: number
  slotId: Uuidv7
}>

export type ReopenCapacitySlotInput = Readonly<{
  actorUserId?: Uuidv7 | null
  slotExpectedVersion: number
  slotId: Uuidv7
}>

export type CapacityRepository = Readonly<{
  closeSlot(input: CloseCapacitySlotInput): Promise<Readonly<{
    closure: CapacityClosureRecord
    slot: CapacitySlotRecord
  }>>
  createSlot(input: CreateCapacitySlotInput): Promise<CapacitySlotRecord>
  findActiveClosureBySlotId(slotId: Uuidv7): Promise<CapacityClosureRecord | null>
  findReservationById(id: Uuidv7): Promise<CapacityReservationRecord | null>
  findReservationByIdempotencyKey(
    providerProfileId: Uuidv7,
    idempotencyKey: string,
  ): Promise<CapacityReservationRecord | null>
  findSlotById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<CapacitySlotRecord | null>
  findSlotByPrinterAndStartsAt(
    providerProfileId: Uuidv7,
    printerId: Uuidv7,
    startsAt: UtcTimestamp,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<CapacitySlotRecord | null>
  listClosures(
    request: RepositoryListRequest<CapacityClosureFilter, CapacityClosureSortField>,
  ): Promise<RepositoryListPage<CapacityClosureRecord>>
  listReservations(
    request: RepositoryListRequest<CapacityReservationFilter, CapacityReservationSortField>,
  ): Promise<RepositoryListPage<CapacityReservationRecord>>
  listSlots(
    request: RepositoryListRequest<CapacitySlotFilter, CapacitySlotSortField>,
  ): Promise<RepositoryListPage<CapacitySlotRecord>>
  releaseReservation(input: ReleaseCapacityReservationInput): Promise<CapacityReservationRecord>
  reopenSlot(input: ReopenCapacitySlotInput): Promise<Readonly<{
    closure: CapacityClosureRecord
    slot: CapacitySlotRecord
  }>>
  reserve(input: ReserveCapacityInput): Promise<CapacityReservationRecord>
  updateSlot(slot: CapacitySlotRecord, expectedVersion: number): Promise<CapacitySlotRecord>
}>
