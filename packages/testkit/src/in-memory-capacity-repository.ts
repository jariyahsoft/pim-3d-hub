import {
  CapacityUnavailableError,
  IdempotencyConflictError,
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  type CapacityClosureFilter,
  type CapacityClosureRecord,
  type CapacityClosureSortField,
  type CapacityRepository,
  type CapacityReservationFilter,
  type CapacityReservationRecord,
  type CapacityReservationSortField,
  type CapacitySlotFilter,
  type CapacitySlotRecord,
  type CapacitySlotSortField,
  type CloseCapacitySlotInput,
  type CreateCapacitySlotInput,
  type ReleaseCapacityReservationInput,
  type ReopenCapacitySlotInput,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type ReserveCapacityInput,
  type SortDirection,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'
import {
  createFakeClock,
  createFakeUuidGenerator,
  type ClockPort,
  type UuidGeneratorPort,
} from './repository-fakes.js'

type CursorPayload<TField extends string> = Readonly<{
  direction: SortDirection
  field: TField
  id: Uuidv7
  value: string | number
}>

export type InMemoryCapacityRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: CapacityRepository
  uuidGenerator: UuidGeneratorPort
}>

function encodeCursor<TField extends string>(payload: CursorPayload<TField>): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload))
}

function decodeCursor<TField extends string>(
  cursor: RepositoryCursor,
  validFields: readonly TField[],
): CursorPayload<TField> {
  const payload = JSON.parse(decodeURIComponent(cursor)) as Partial<CursorPayload<TField>>

  if (
    !payload ||
    (payload.direction !== 'asc' && payload.direction !== 'desc') ||
    !validFields.includes(payload.field as TField) ||
    typeof payload.id !== 'string' ||
    (typeof payload.value !== 'string' && typeof payload.value !== 'number')
  ) {
    throw new TypeError('Invalid repository cursor')
  }

  return {
    direction: payload.direction,
    field: payload.field as TField,
    id: payload.id as Uuidv7,
    value: payload.value,
  }
}

function compareValues(left: string | number, right: string | number, direction: SortDirection): number {
  if (left === right) {
    return 0
  }

  if (direction === 'asc') {
    return left < right ? -1 : 1
  }

  return left > right ? -1 : 1
}

function compareRecords<TRecord extends Readonly<Record<string, unknown>>, TField extends string>(
  left: TRecord,
  right: TRecord,
  field: TField,
  direction: SortDirection,
): number {
  const fieldComparison = compareValues(
    left[field] as string | number,
    right[field] as string | number,
    direction,
  )

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return String(left['id']).localeCompare(String(right['id']))
}

function compareRecordToCursor<TRecord extends Readonly<Record<string, unknown>>, TField extends string>(
  record: TRecord,
  cursor: CursorPayload<TField>,
): number {
  const fieldComparison = compareValues(
    record[cursor.field] as string | number,
    cursor.value,
    cursor.direction,
  )

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return String(record['id']).localeCompare(cursor.id)
}

function cloneRecord<TRecord extends Readonly<Record<string, unknown>>>(record: TRecord): TRecord {
  return Object.freeze({ ...record }) as TRecord
}

function createListPage<TRecord extends Readonly<Record<string, unknown>>, TField extends string>(
  records: readonly TRecord[],
  request: RepositoryListRequest<Readonly<Record<string, never>>, TField>,
): RepositoryListPage<TRecord> {
  const filtered = [...records]
  filtered.sort((left, right) =>
    compareRecords(left, right, request.sort.field, request.sort.direction),
  )

  const cursor = request.cursor
  const startIndex = cursor
    ? filtered.findIndex((record) =>
        compareRecordToCursor(record, decodeCursor(cursor, [request.sort.field])) > 0,
      )
    : 0
  const normalizedStartIndex = startIndex < 0 ? filtered.length : startIndex
  const pageItems = filtered.slice(normalizedStartIndex, normalizedStartIndex + request.limit)
  const nextItem = filtered[normalizedStartIndex + request.limit]

  return {
    items: pageItems.map((item) => cloneRecord(item)),
    nextCursor: nextItem
      ? encodeCursor({
          direction: request.sort.direction,
          field: request.sort.field,
          id: nextItem['id'] as Uuidv7,
          value: nextItem[request.sort.field] as string | number,
        })
      : null,
  }
}

function createSlotLookupKey(
  providerProfileId: Uuidv7,
  printerId: Uuidv7,
  startsAt: UtcTimestamp,
): string {
  return `${providerProfileId}:${printerId}:${startsAt}`
}

function createReservationKey(providerProfileId: Uuidv7, idempotencyKey: string): string {
  return `${providerProfileId}:${idempotencyKey.trim()}`
}

function normalizePositiveInteger(field: string, value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be greater than zero`)
  }

  return value
}

function assertTimeRange(startsAt: UtcTimestamp, endsAt: UtcTimestamp): void {
  if (Date.parse(startsAt) >= Date.parse(endsAt)) {
    throw new RangeError('startsAt must be before endsAt')
  }
}

export function createInMemoryCapacityRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryCapacityRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const slots = new Map<Uuidv7, CapacitySlotRecord>()
  const slotLookups = new Map<string, Uuidv7>()
  const closures = new Map<Uuidv7, CapacityClosureRecord>()
  const activeClosures = new Map<Uuidv7, Uuidv7>()
  const reservations = new Map<Uuidv7, CapacityReservationRecord>()
  const reservationKeys = new Map<string, Uuidv7>()

  function requireSlot(id: Uuidv7): CapacitySlotRecord {
    const record = slots.get(id)

    if (!record || record.deletedAt !== null) {
      throw new Error(`CapacitySlot ${id} was not found`)
    }

    return record
  }

  function requireClosure(id: Uuidv7): CapacityClosureRecord {
    const record = closures.get(id)

    if (!record) {
      throw new Error(`CapacityClosure ${id} was not found`)
    }

    return record
  }

  function requireReservation(id: Uuidv7): CapacityReservationRecord {
    const record = reservations.get(id)

    if (!record) {
      throw new Error(`CapacityReservation ${id} was not found`)
    }

    return record
  }

  const repository: CapacityRepository = Object.freeze({
    async closeSlot(command: CloseCapacitySlotInput) {
      const currentSlot = requireSlot(command.slotId)

      if (currentSlot.version !== command.slotExpectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: currentSlot.version,
          entityId: currentSlot.id,
          entityName: 'CapacitySlot',
          expectedVersion: command.slotExpectedVersion,
        })
      }

      if (currentSlot.status === 'CLOSED' || activeClosures.has(currentSlot.id)) {
        throw new CapacityUnavailableError('capacity slot is already closed', ['slotId'])
      }

      const now = clock.now()
      const closure: CapacityClosureRecord = Object.freeze({
        createdAt: now,
        createdBy: command.actorUserId ?? null,
        deletedAt: null,
        endsAt: currentSlot.endsAt,
        id: uuidGenerator.next(),
        printerId: currentSlot.printerId,
        providerProfileId: currentSlot.providerProfileId,
        reason: command.reason?.trim() || null,
        releasedAt: null,
        reopenStatus: currentSlot.status,
        schemaVersion: 1,
        slotId: currentSlot.id,
        startsAt: currentSlot.startsAt,
        status: 'ACTIVE',
        updatedAt: now,
        updatedBy: command.actorUserId ?? null,
        version: 1,
      })
      const slot: CapacitySlotRecord = Object.freeze({
        ...currentSlot,
        status: 'CLOSED',
        updatedAt: now,
        updatedBy: command.actorUserId ?? null,
        version: currentSlot.version + 1,
      })

      closures.set(closure.id, closure)
      activeClosures.set(slot.id, closure.id)
      slots.set(slot.id, slot)

      return Object.freeze({
        closure: cloneRecord(closure),
        slot: cloneRecord(slot),
      })
    },

    async createSlot(inputRecord: CreateCapacitySlotInput): Promise<CapacitySlotRecord> {
      const id = inputRecord.id ?? uuidGenerator.next()
      const slotLookupKey = createSlotLookupKey(
        inputRecord.providerProfileId,
        inputRecord.printerId,
        inputRecord.startsAt,
      )

      if (slots.has(id)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'capacity_slots.id',
          entityName: 'CapacitySlot',
          value: id,
        })
      }

      if (slotLookups.has(slotLookupKey)) {
        throw new RepositoryUniqueConstraintError({
          constraintName: 'capacity_slots.providerProfileId_printerId_startsAt',
          entityName: 'CapacitySlot',
          value: slotLookupKey,
        })
      }

      assertTimeRange(inputRecord.startsAt, inputRecord.endsAt)

      const totalUnits = normalizePositiveInteger('totalUnits', inputRecord.totalUnits)
      const reservedUnits = inputRecord.reservedUnits ?? 0

      if (!Number.isInteger(reservedUnits) || reservedUnits < 0 || reservedUnits > totalUnits) {
        throw new RangeError('reservedUnits must be between zero and totalUnits')
      }

      const now = clock.now()
      const record: CapacitySlotRecord = Object.freeze({
        createdAt: now,
        createdBy: inputRecord.createdBy ?? null,
        deletedAt: null,
        endsAt: inputRecord.endsAt,
        id,
        printerId: inputRecord.printerId,
        providerProfileId: inputRecord.providerProfileId,
        reservedUnits,
        schemaVersion: 1,
        startsAt: inputRecord.startsAt,
        status: inputRecord.status ?? 'OPEN',
        totalUnits,
        updatedAt: now,
        updatedBy: inputRecord.updatedBy ?? inputRecord.createdBy ?? null,
        version: 1,
      })

      slots.set(record.id, record)
      slotLookups.set(slotLookupKey, record.id)
      return cloneRecord(record)
    },

    async findActiveClosureBySlotId(slotId: Uuidv7): Promise<CapacityClosureRecord | null> {
      const closureId = activeClosures.get(slotId)
      if (!closureId) {
        return null
      }

      return cloneRecord(requireClosure(closureId))
    },

    async findReservationById(id: Uuidv7): Promise<CapacityReservationRecord | null> {
      const record = reservations.get(id)
      return record ? cloneRecord(record) : null
    },

    async findReservationByIdempotencyKey(
      providerProfileId: Uuidv7,
      idempotencyKey: string,
    ): Promise<CapacityReservationRecord | null> {
      const id = reservationKeys.get(createReservationKey(providerProfileId, idempotencyKey))
      if (!id) {
        return null
      }

      return cloneRecord(requireReservation(id))
    },

    async findSlotById(
      id: Uuidv7,
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<CapacitySlotRecord | null> {
      const record = slots.get(id)

      if (!record) {
        return null
      }

      if (!options?.includeDeleted && record.deletedAt !== null) {
        return null
      }

      return cloneRecord(record)
    },

    async findSlotByPrinterAndStartsAt(
      providerProfileId: Uuidv7,
      printerId: Uuidv7,
      startsAt: UtcTimestamp,
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<CapacitySlotRecord | null> {
      const slotId = slotLookups.get(createSlotLookupKey(providerProfileId, printerId, startsAt))
      if (!slotId) {
        return null
      }

      const record = requireSlot(slotId)
      if (!options?.includeDeleted && record.deletedAt !== null) {
        return null
      }

      return cloneRecord(record)
    },

    async listClosures(
      request: RepositoryListRequest<CapacityClosureFilter, CapacityClosureSortField>,
    ): Promise<RepositoryListPage<CapacityClosureRecord>> {
      const filtered = [...closures.values()].filter((record) => {
        if (!request.includeDeleted && record.deletedAt !== null) {
          return false
        }

        if (request.filter?.providerProfileId && record.providerProfileId !== request.filter.providerProfileId) {
          return false
        }

        if (request.filter?.printerId && record.printerId !== request.filter.printerId) {
          return false
        }

        if (request.filter?.slotId && record.slotId !== request.filter.slotId) {
          return false
        }

        if (request.filter?.status && record.status !== request.filter.status) {
          return false
        }

        return true
      })

      return createListPage(
        filtered,
        request as RepositoryListRequest<Readonly<Record<string, never>>, CapacityClosureSortField>,
      )
    },

    async listReservations(
      request: RepositoryListRequest<CapacityReservationFilter, CapacityReservationSortField>,
    ): Promise<RepositoryListPage<CapacityReservationRecord>> {
      const filtered = [...reservations.values()].filter((record) => {
        if (!request.includeDeleted && record.deletedAt !== null) {
          return false
        }

        if (request.filter?.providerProfileId && record.providerProfileId !== request.filter.providerProfileId) {
          return false
        }

        if (request.filter?.printerId && record.printerId !== request.filter.printerId) {
          return false
        }

        if (request.filter?.reservedByUserId && record.reservedByUserId !== request.filter.reservedByUserId) {
          return false
        }

        if (request.filter?.slotId && record.slotId !== request.filter.slotId) {
          return false
        }

        if (request.filter?.status && record.status !== request.filter.status) {
          return false
        }

        if (request.filter?.expiresAtLte && Date.parse(record.expiresAt) > Date.parse(request.filter.expiresAtLte)) {
          return false
        }

        return true
      })

      return createListPage(
        filtered,
        request as RepositoryListRequest<Readonly<Record<string, never>>, CapacityReservationSortField>,
      )
    },

    async listSlots(
      request: RepositoryListRequest<CapacitySlotFilter, CapacitySlotSortField>,
    ): Promise<RepositoryListPage<CapacitySlotRecord>> {
      const filtered = [...slots.values()].filter((record) => {
        if (!request.includeDeleted && record.deletedAt !== null) {
          return false
        }

        if (request.filter?.providerProfileId && record.providerProfileId !== request.filter.providerProfileId) {
          return false
        }

        if (request.filter?.printerId && record.printerId !== request.filter.printerId) {
          return false
        }

        if (request.filter?.status && record.status !== request.filter.status) {
          return false
        }

        if (request.filter?.startsAtGte && Date.parse(record.startsAt) < Date.parse(request.filter.startsAtGte)) {
          return false
        }

        if (request.filter?.startsAtLte && Date.parse(record.startsAt) > Date.parse(request.filter.startsAtLte)) {
          return false
        }

        return true
      })

      return createListPage(
        filtered,
        request as RepositoryListRequest<Readonly<Record<string, never>>, CapacitySlotSortField>,
      )
    },

    async releaseReservation(inputRecord: ReleaseCapacityReservationInput): Promise<CapacityReservationRecord> {
      const currentReservation = requireReservation(inputRecord.reservationId)

      if (currentReservation.status !== 'ACTIVE') {
        return cloneRecord(currentReservation)
      }

      const currentSlot = requireSlot(currentReservation.slotId)

      if (currentSlot.reservedUnits < currentReservation.units) {
        throw new CapacityUnavailableError('capacity slot accounting underflow', ['reservationId'])
      }

      const now = clock.now()
      const reservation: CapacityReservationRecord = Object.freeze({
        ...currentReservation,
        releaseReason: inputRecord.reason,
        releasedAt: now,
        status: inputRecord.reason === 'EXPIRED' ? 'EXPIRED' : 'RELEASED',
        updatedAt: now,
        updatedBy: inputRecord.actorUserId ?? null,
        version: currentReservation.version + 1,
      })
      const slot: CapacitySlotRecord = Object.freeze({
        ...currentSlot,
        reservedUnits: currentSlot.reservedUnits - currentReservation.units,
        updatedAt: now,
        updatedBy: inputRecord.actorUserId ?? null,
        version: currentSlot.version + 1,
      })

      reservations.set(reservation.id, reservation)
      slots.set(slot.id, slot)

      return cloneRecord(reservation)
    },

    async reopenSlot(command: ReopenCapacitySlotInput) {
      const currentSlot = requireSlot(command.slotId)

      if (currentSlot.version !== command.slotExpectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: currentSlot.version,
          entityId: currentSlot.id,
          entityName: 'CapacitySlot',
          expectedVersion: command.slotExpectedVersion,
        })
      }

      const closureId = activeClosures.get(command.slotId)
      if (!closureId) {
        throw new CapacityUnavailableError('capacity slot is not closed', ['slotId'])
      }

      const currentClosure = requireClosure(closureId)
      const now = clock.now()
      const closure: CapacityClosureRecord = Object.freeze({
        ...currentClosure,
        releasedAt: now,
        status: 'RELEASED',
        updatedAt: now,
        updatedBy: command.actorUserId ?? null,
        version: currentClosure.version + 1,
      })
      const slot: CapacitySlotRecord = Object.freeze({
        ...currentSlot,
        status: currentClosure.reopenStatus,
        updatedAt: now,
        updatedBy: command.actorUserId ?? null,
        version: currentSlot.version + 1,
      })

      closures.set(closure.id, closure)
      activeClosures.delete(command.slotId)
      slots.set(slot.id, slot)

      return Object.freeze({
        closure: cloneRecord(closure),
        slot: cloneRecord(slot),
      })
    },

    async reserve(inputRecord: ReserveCapacityInput): Promise<CapacityReservationRecord> {
      const normalizedIdempotencyKey = inputRecord.idempotencyKey.trim()
      if (!normalizedIdempotencyKey) {
        throw new IdempotencyConflictError('idempotencyKey is required')
      }

      const key = createReservationKey(inputRecord.providerProfileId, normalizedIdempotencyKey)
      const existingReservationId = reservationKeys.get(key)
      if (existingReservationId) {
        const existing = requireReservation(existingReservationId)
        if (existing.requestHash !== inputRecord.requestHash) {
          throw new IdempotencyConflictError('idempotency key was already used for another request')
        }

        return cloneRecord(existing)
      }

      const currentSlot = requireSlot(inputRecord.slotId)

      if (
        currentSlot.providerProfileId !== inputRecord.providerProfileId ||
        currentSlot.printerId !== inputRecord.printerId
      ) {
        throw new CapacityUnavailableError('capacity slot does not match the requested provider or printer', [
          'slotId',
          'printerId',
          'providerProfileId',
        ])
      }

      if (currentSlot.status !== 'OPEN') {
        throw new CapacityUnavailableError('capacity slot is not available for reservation', ['slotId'])
      }

      const units = normalizePositiveInteger('units', inputRecord.units)
      const availableUnits = currentSlot.totalUnits - currentSlot.reservedUnits
      if (availableUnits < units) {
        throw new CapacityUnavailableError('requested units exceed available capacity', ['units'])
      }

      const now = clock.now()
      const reservation: CapacityReservationRecord = Object.freeze({
        createdAt: now,
        createdBy: inputRecord.createdBy ?? null,
        deletedAt: null,
        expiresAt: inputRecord.expiresAt,
        id: inputRecord.id ?? uuidGenerator.next(),
        idempotencyKey: normalizedIdempotencyKey,
        printerId: inputRecord.printerId,
        providerProfileId: inputRecord.providerProfileId,
        providerServiceId: inputRecord.providerServiceId,
        releaseReason: null,
        releasedAt: null,
        requestHash: inputRecord.requestHash,
        reservedByUserId: inputRecord.reservedByUserId,
        schemaVersion: 1,
        slotId: inputRecord.slotId,
        status: 'ACTIVE',
        units,
        updatedAt: now,
        updatedBy: inputRecord.updatedBy ?? inputRecord.createdBy ?? null,
        version: 1,
      })
      const slot: CapacitySlotRecord = Object.freeze({
        ...currentSlot,
        reservedUnits: currentSlot.reservedUnits + units,
        updatedAt: now,
        updatedBy: inputRecord.updatedBy ?? inputRecord.createdBy ?? null,
        version: currentSlot.version + 1,
      })

      reservations.set(reservation.id, reservation)
      reservationKeys.set(key, reservation.id)
      slots.set(slot.id, slot)

      return cloneRecord(reservation)
    },

    async updateSlot(slotRecord: CapacitySlotRecord, expectedVersion: number): Promise<CapacitySlotRecord> {
      const current = requireSlot(slotRecord.id)

      if (current.version !== expectedVersion) {
        throw new RepositoryConflictError({
          actualVersion: current.version,
          entityId: current.id,
          entityName: 'CapacitySlot',
          expectedVersion,
        })
      }

      if (
        current.providerProfileId !== slotRecord.providerProfileId ||
        current.printerId !== slotRecord.printerId ||
        current.startsAt !== slotRecord.startsAt
      ) {
        throw new CapacityUnavailableError('slot identity fields cannot be changed', [
          'providerProfileId',
          'printerId',
          'startsAt',
        ])
      }

      assertTimeRange(slotRecord.startsAt, slotRecord.endsAt)

      if (slotRecord.status === 'CLOSED' && !activeClosures.has(slotRecord.id)) {
        throw new CapacityUnavailableError('closed status must be managed through closure commands', ['status'])
      }

      if (slotRecord.reservedUnits > slotRecord.totalUnits) {
        throw new CapacityUnavailableError('reserved units cannot exceed total units', ['reservedUnits'])
      }

      const next: CapacitySlotRecord = Object.freeze({
        ...slotRecord,
        createdAt: current.createdAt,
        createdBy: current.createdBy ?? null,
        deletedAt: current.deletedAt,
        schemaVersion: current.schemaVersion,
        updatedAt: clock.now(),
        updatedBy: slotRecord.updatedBy ?? null,
        version: current.version + 1,
      })

      slots.set(next.id, next)
      return cloneRecord(next)
    },
  })

  return Object.freeze({
    clock,
    repository,
    uuidGenerator,
  })
}
