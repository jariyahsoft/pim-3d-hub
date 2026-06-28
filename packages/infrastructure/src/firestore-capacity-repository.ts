import { Firestore, Timestamp } from '@google-cloud/firestore'
import {
  CapacityUnavailableError,
  IdempotencyConflictError,
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  parseUtcTimestamp,
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

type FirestoreCapacitySlotDocument = Readonly<{
  createdAt: Timestamp
  createdBy: string | null
  deletedAt: Timestamp | null
  endsAt: Timestamp
  id: string
  printerId: string
  providerProfileId: string
  reservedUnits: number
  schemaVersion: number
  startsAt: Timestamp
  status: CapacitySlotRecord['status']
  totalUnits: number
  updatedAt: Timestamp
  updatedBy: string | null
  version: number
}>

type FirestoreCapacityClosureDocument = Readonly<{
  createdAt: Timestamp
  createdBy: string | null
  deletedAt: Timestamp | null
  endsAt: Timestamp
  id: string
  printerId: string
  providerProfileId: string
  reason: string | null
  releasedAt: Timestamp | null
  reopenStatus: CapacityClosureRecord['reopenStatus']
  schemaVersion: number
  slotId: string
  startsAt: Timestamp
  status: CapacityClosureRecord['status']
  updatedAt: Timestamp
  updatedBy: string | null
  version: number
}>

type FirestoreCapacityReservationDocument = Readonly<{
  createdAt: Timestamp
  createdBy: string | null
  deletedAt: Timestamp | null
  expiresAt: Timestamp
  id: string
  idempotencyKey: string
  printerId: string
  providerProfileId: string
  providerServiceId: string
  releaseReason: CapacityReservationRecord['releaseReason']
  releasedAt: Timestamp | null
  requestHash: string
  reservedByUserId: string | null
  schemaVersion: number
  slotId: string
  status: CapacityReservationRecord['status']
  units: number
  updatedAt: Timestamp
  updatedBy: string | null
  version: number
}>

type SlotLookupDocument = Readonly<{
  printerId: string
  providerProfileId: string
  slotId: string
  startsAt: Timestamp
  updatedAt: Timestamp
}>

type ActiveClosureDocument = Readonly<{
  closureId: string
  slotId: string
  updatedAt: Timestamp
}>

type ReservationKeyDocument = Readonly<{
  idempotencyKey: string
  providerProfileId: string
  requestHash: string
  reservationId: string
  updatedAt: Timestamp
}>

type CursorPayload<TField extends string> = Readonly<{
  direction: SortDirection
  field: TField
  id: Uuidv7
  value: string | number
}>

type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

type RepositoryOptions = Readonly<{
  clock: ClockPort
  collectionPrefix?: string
  firestore: Firestore
  uuidGenerator: UuidGeneratorPort
}>

function createCollectionName(baseName: string, prefix?: string): string {
  return prefix ? `${prefix}_${baseName}` : baseName
}

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

function toTimestamp(value: UtcTimestamp | null): Timestamp | null {
  return value ? Timestamp.fromDate(new Date(value)) : null
}

function toTimestampString(value: Timestamp | null): UtcTimestamp | null {
  return value ? parseUtcTimestamp(value.toDate()) : null
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

function toFirestoreSlotDocument(record: CapacitySlotRecord): FirestoreCapacitySlotDocument {
  return Object.freeze({
    createdAt: Timestamp.fromDate(new Date(record.createdAt)),
    createdBy: record.createdBy ?? null,
    deletedAt: toTimestamp(record.deletedAt),
    endsAt: Timestamp.fromDate(new Date(record.endsAt)),
    id: record.id,
    printerId: record.printerId,
    providerProfileId: record.providerProfileId,
    reservedUnits: record.reservedUnits,
    schemaVersion: record.schemaVersion,
    startsAt: Timestamp.fromDate(new Date(record.startsAt)),
    status: record.status,
    totalUnits: record.totalUnits,
    updatedAt: Timestamp.fromDate(new Date(record.updatedAt)),
    updatedBy: record.updatedBy ?? null,
    version: record.version,
  })
}

function fromFirestoreSlotDocument(document: FirestoreCapacitySlotDocument): CapacitySlotRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp(document.createdAt.toDate()),
    createdBy: (document.createdBy as Uuidv7 | null) ?? null,
    deletedAt: toTimestampString(document.deletedAt),
    endsAt: parseUtcTimestamp(document.endsAt.toDate()),
    id: document.id as Uuidv7,
    printerId: document.printerId as Uuidv7,
    providerProfileId: document.providerProfileId as Uuidv7,
    reservedUnits: document.reservedUnits,
    schemaVersion: document.schemaVersion,
    startsAt: parseUtcTimestamp(document.startsAt.toDate()),
    status: document.status,
    totalUnits: document.totalUnits,
    updatedAt: parseUtcTimestamp(document.updatedAt.toDate()),
    updatedBy: (document.updatedBy as Uuidv7 | null) ?? null,
    version: document.version,
  })
}

function toFirestoreClosureDocument(
  record: CapacityClosureRecord,
): FirestoreCapacityClosureDocument {
  return Object.freeze({
    createdAt: Timestamp.fromDate(new Date(record.createdAt)),
    createdBy: record.createdBy ?? null,
    deletedAt: toTimestamp(record.deletedAt),
    endsAt: Timestamp.fromDate(new Date(record.endsAt)),
    id: record.id,
    printerId: record.printerId,
    providerProfileId: record.providerProfileId,
    reason: record.reason,
    releasedAt: toTimestamp(record.releasedAt),
    reopenStatus: record.reopenStatus,
    schemaVersion: record.schemaVersion,
    slotId: record.slotId,
    startsAt: Timestamp.fromDate(new Date(record.startsAt)),
    status: record.status,
    updatedAt: Timestamp.fromDate(new Date(record.updatedAt)),
    updatedBy: record.updatedBy ?? null,
    version: record.version,
  })
}

function fromFirestoreClosureDocument(
  document: FirestoreCapacityClosureDocument,
): CapacityClosureRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp(document.createdAt.toDate()),
    createdBy: (document.createdBy as Uuidv7 | null) ?? null,
    deletedAt: toTimestampString(document.deletedAt),
    endsAt: parseUtcTimestamp(document.endsAt.toDate()),
    id: document.id as Uuidv7,
    printerId: document.printerId as Uuidv7,
    providerProfileId: document.providerProfileId as Uuidv7,
    reason: document.reason ?? null,
    releasedAt: toTimestampString(document.releasedAt),
    reopenStatus: document.reopenStatus,
    schemaVersion: document.schemaVersion,
    slotId: document.slotId as Uuidv7,
    startsAt: parseUtcTimestamp(document.startsAt.toDate()),
    status: document.status,
    updatedAt: parseUtcTimestamp(document.updatedAt.toDate()),
    updatedBy: (document.updatedBy as Uuidv7 | null) ?? null,
    version: document.version,
  })
}

function toFirestoreReservationDocument(
  record: CapacityReservationRecord,
): FirestoreCapacityReservationDocument {
  return Object.freeze({
    createdAt: Timestamp.fromDate(new Date(record.createdAt)),
    createdBy: record.createdBy ?? null,
    deletedAt: toTimestamp(record.deletedAt),
    expiresAt: Timestamp.fromDate(new Date(record.expiresAt)),
    id: record.id,
    idempotencyKey: record.idempotencyKey,
    printerId: record.printerId,
    providerProfileId: record.providerProfileId,
    providerServiceId: record.providerServiceId,
    releaseReason: record.releaseReason,
    releasedAt: toTimestamp(record.releasedAt),
    requestHash: record.requestHash,
    reservedByUserId: record.reservedByUserId ?? null,
    schemaVersion: record.schemaVersion,
    slotId: record.slotId,
    status: record.status,
    units: record.units,
    updatedAt: Timestamp.fromDate(new Date(record.updatedAt)),
    updatedBy: record.updatedBy ?? null,
    version: record.version,
  })
}

function fromFirestoreReservationDocument(
  document: FirestoreCapacityReservationDocument,
): CapacityReservationRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp(document.createdAt.toDate()),
    createdBy: (document.createdBy as Uuidv7 | null) ?? null,
    deletedAt: toTimestampString(document.deletedAt),
    expiresAt: parseUtcTimestamp(document.expiresAt.toDate()),
    id: document.id as Uuidv7,
    idempotencyKey: document.idempotencyKey,
    printerId: document.printerId as Uuidv7,
    providerProfileId: document.providerProfileId as Uuidv7,
    providerServiceId: document.providerServiceId as Uuidv7,
    releaseReason: document.releaseReason ?? null,
    releasedAt: toTimestampString(document.releasedAt),
    requestHash: document.requestHash,
    reservedByUserId: (document.reservedByUserId as Uuidv7 | null) ?? null,
    schemaVersion: document.schemaVersion,
    slotId: document.slotId as Uuidv7,
    status: document.status,
    units: document.units,
    updatedAt: parseUtcTimestamp(document.updatedAt.toDate()),
    updatedBy: (document.updatedBy as Uuidv7 | null) ?? null,
    version: document.version,
  })
}

function getSlotsCollection(firestore: Firestore, prefix?: string) {
  return firestore.collection(createCollectionName('capacity_slots', prefix))
}

function getSlotLookupCollection(firestore: Firestore, prefix?: string) {
  return firestore.collection(createCollectionName('capacity_slot_keys', prefix))
}

function getClosuresCollection(firestore: Firestore, prefix?: string) {
  return firestore.collection(createCollectionName('capacity_closures', prefix))
}

function getActiveClosuresCollection(firestore: Firestore, prefix?: string) {
  return firestore.collection(createCollectionName('capacity_active_closures', prefix))
}

function getReservationsCollection(firestore: Firestore, prefix?: string) {
  return firestore.collection(createCollectionName('capacity_reservations', prefix))
}

function getReservationKeysCollection(firestore: Firestore, prefix?: string) {
  return firestore.collection(createCollectionName('capacity_reservation_keys', prefix))
}

async function loadAllSlots(
  firestore: Firestore,
  prefix?: string,
): Promise<readonly CapacitySlotRecord[]> {
  const snapshot = await getSlotsCollection(firestore, prefix).get()
  return snapshot.docs.map((document) =>
    fromFirestoreSlotDocument(document.data() as FirestoreCapacitySlotDocument),
  )
}

async function loadAllClosures(
  firestore: Firestore,
  prefix?: string,
): Promise<readonly CapacityClosureRecord[]> {
  const snapshot = await getClosuresCollection(firestore, prefix).get()
  return snapshot.docs.map((document) =>
    fromFirestoreClosureDocument(document.data() as FirestoreCapacityClosureDocument),
  )
}

async function loadAllReservations(
  firestore: Firestore,
  prefix?: string,
): Promise<readonly CapacityReservationRecord[]> {
  const snapshot = await getReservationsCollection(firestore, prefix).get()
  return snapshot.docs.map((document) =>
    fromFirestoreReservationDocument(document.data() as FirestoreCapacityReservationDocument),
  )
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

export function createFirestoreCapacityRepository(
  input: RepositoryOptions,
): CapacityRepository {
  const slots = getSlotsCollection(input.firestore, input.collectionPrefix)
  const slotKeys = getSlotLookupCollection(input.firestore, input.collectionPrefix)
  const closures = getClosuresCollection(input.firestore, input.collectionPrefix)
  const activeClosures = getActiveClosuresCollection(input.firestore, input.collectionPrefix)
  const reservations = getReservationsCollection(input.firestore, input.collectionPrefix)
  const reservationKeys = getReservationKeysCollection(input.firestore, input.collectionPrefix)

  return Object.freeze({
    async closeSlot(command: CloseCapacitySlotInput) {
      let nextSlot: CapacitySlotRecord | null = null
      let nextClosure: CapacityClosureRecord | null = null

      await input.firestore.runTransaction(async (transaction) => {
        const slotRef = slots.doc(command.slotId)
        const activeClosureRef = activeClosures.doc(command.slotId)
        const [slotSnapshot, activeClosureSnapshot] = await Promise.all([
          transaction.get(slotRef),
          transaction.get(activeClosureRef),
        ])

        if (!slotSnapshot.exists) {
          throw new Error(`CapacitySlot ${command.slotId} was not found`)
        }

        const currentSlot = fromFirestoreSlotDocument(
          slotSnapshot.data() as FirestoreCapacitySlotDocument,
        )

        if (currentSlot.version !== command.slotExpectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: currentSlot.version,
            entityId: currentSlot.id,
            entityName: 'CapacitySlot',
            expectedVersion: command.slotExpectedVersion,
          })
        }

        if (currentSlot.status === 'CLOSED' || activeClosureSnapshot.exists) {
          throw new CapacityUnavailableError('capacity slot is already closed', ['slotId'])
        }

        const now = input.clock.now()
        nextSlot = Object.freeze({
          ...currentSlot,
          status: 'CLOSED' as const,
          updatedAt: now,
          updatedBy: command.actorUserId ?? null,
          version: currentSlot.version + 1,
        })
        nextClosure = Object.freeze({
          createdAt: now,
          createdBy: command.actorUserId ?? null,
          deletedAt: null,
          endsAt: currentSlot.endsAt,
          id: input.uuidGenerator.next(),
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

        transaction.set(slotRef, toFirestoreSlotDocument(nextSlot))
        transaction.set(closures.doc(nextClosure.id), toFirestoreClosureDocument(nextClosure))
        transaction.set(activeClosureRef, {
          closureId: nextClosure.id,
          slotId: currentSlot.id,
          updatedAt: Timestamp.fromDate(new Date(now)),
        } satisfies ActiveClosureDocument)
      })

      if (!nextClosure || !nextSlot) {
        throw new Error('Capacity slot close transaction did not produce a result')
      }

      return Object.freeze({
        closure: cloneRecord(nextClosure),
        slot: cloneRecord(nextSlot),
      })
    },

    async createSlot(createInput: CreateCapacitySlotInput): Promise<CapacitySlotRecord> {
      const id = createInput.id ?? input.uuidGenerator.next()
      const lookupKey = createSlotLookupKey(
        createInput.providerProfileId,
        createInput.printerId,
        createInput.startsAt,
      )

      assertTimeRange(createInput.startsAt, createInput.endsAt)
      const totalUnits = normalizePositiveInteger('totalUnits', createInput.totalUnits)
      const reservedUnits = createInput.reservedUnits ?? 0
      if (!Number.isInteger(reservedUnits) || reservedUnits < 0 || reservedUnits > totalUnits) {
        throw new RangeError('reservedUnits must be between zero and totalUnits')
      }

      const now = input.clock.now()
      const record: CapacitySlotRecord = Object.freeze({
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deletedAt: null,
        endsAt: createInput.endsAt,
        id,
        printerId: createInput.printerId,
        providerProfileId: createInput.providerProfileId,
        reservedUnits,
        schemaVersion: 1,
        startsAt: createInput.startsAt,
        status: createInput.status ?? 'OPEN',
        totalUnits,
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        version: 1,
      })

      await input.firestore.runTransaction(async (transaction) => {
        const recordRef = slots.doc(record.id)
        const lookupRef = slotKeys.doc(lookupKey)
        const [recordSnapshot, lookupSnapshot] = await Promise.all([
          transaction.get(recordRef),
          transaction.get(lookupRef),
        ])

        if (recordSnapshot.exists) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'capacity_slots.id',
            entityName: 'CapacitySlot',
            value: record.id,
          })
        }

        if (lookupSnapshot.exists) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'capacity_slots.providerProfileId_printerId_startsAt',
            entityName: 'CapacitySlot',
            value: lookupKey,
          })
        }

        transaction.set(recordRef, toFirestoreSlotDocument(record))
        transaction.set(lookupRef, {
          printerId: record.printerId,
          providerProfileId: record.providerProfileId,
          slotId: record.id,
          startsAt: Timestamp.fromDate(new Date(record.startsAt)),
          updatedAt: Timestamp.fromDate(new Date(now)),
        } satisfies SlotLookupDocument)
      })

      return cloneRecord(record)
    },

    async findActiveClosureBySlotId(slotId: Uuidv7): Promise<CapacityClosureRecord | null> {
      const activeSnapshot = await activeClosures.doc(slotId).get()
      if (!activeSnapshot.exists) {
        return null
      }

      const activeDocument = activeSnapshot.data() as ActiveClosureDocument | undefined
      if (!activeDocument) {
        return null
      }

      const closureSnapshot = await closures.doc(activeDocument.closureId).get()
      if (!closureSnapshot.exists) {
        return null
      }

      return cloneRecord(
        fromFirestoreClosureDocument(
          closureSnapshot.data() as FirestoreCapacityClosureDocument,
        ),
      )
    },

    async findReservationById(id: Uuidv7): Promise<CapacityReservationRecord | null> {
      const snapshot = await reservations.doc(id).get()
      if (!snapshot.exists) {
        return null
      }

      return cloneRecord(
        fromFirestoreReservationDocument(snapshot.data() as FirestoreCapacityReservationDocument),
      )
    },

    async findReservationByIdempotencyKey(
      providerProfileId: Uuidv7,
      idempotencyKey: string,
    ): Promise<CapacityReservationRecord | null> {
      const keySnapshot = await reservationKeys
        .doc(createReservationKey(providerProfileId, idempotencyKey))
        .get()
      if (!keySnapshot.exists) {
        return null
      }

      const keyDocument = keySnapshot.data() as ReservationKeyDocument | undefined
      if (!keyDocument) {
        return null
      }

      const reservationSnapshot = await reservations.doc(keyDocument.reservationId).get()
      if (!reservationSnapshot.exists) {
        return null
      }

      return cloneRecord(
        fromFirestoreReservationDocument(
          reservationSnapshot.data() as FirestoreCapacityReservationDocument,
        ),
      )
    },

    async findSlotById(
      id: Uuidv7,
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<CapacitySlotRecord | null> {
      const snapshot = await slots.doc(id).get()
      if (!snapshot.exists) {
        return null
      }

      const record = fromFirestoreSlotDocument(snapshot.data() as FirestoreCapacitySlotDocument)
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
      const lookupSnapshot = await slotKeys
        .doc(createSlotLookupKey(providerProfileId, printerId, startsAt))
        .get()
      if (!lookupSnapshot.exists) {
        return null
      }

      const lookupDocument = lookupSnapshot.data() as SlotLookupDocument | undefined
      if (!lookupDocument) {
        return null
      }

      return this.findSlotById(lookupDocument.slotId as Uuidv7, options)
    },

    async listClosures(
      request: RepositoryListRequest<CapacityClosureFilter, CapacityClosureSortField>,
    ): Promise<RepositoryListPage<CapacityClosureRecord>> {
      const records = (await loadAllClosures(input.firestore, input.collectionPrefix)).filter((record) => {
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
        records,
        request as RepositoryListRequest<Readonly<Record<string, never>>, CapacityClosureSortField>,
      )
    },

    async listReservations(
      request: RepositoryListRequest<CapacityReservationFilter, CapacityReservationSortField>,
    ): Promise<RepositoryListPage<CapacityReservationRecord>> {
      const records = (
        await loadAllReservations(input.firestore, input.collectionPrefix)
      ).filter((record) => {
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
        records,
        request as RepositoryListRequest<Readonly<Record<string, never>>, CapacityReservationSortField>,
      )
    },

    async listSlots(
      request: RepositoryListRequest<CapacitySlotFilter, CapacitySlotSortField>,
    ): Promise<RepositoryListPage<CapacitySlotRecord>> {
      const records = (await loadAllSlots(input.firestore, input.collectionPrefix)).filter((record) => {
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
        records,
        request as RepositoryListRequest<Readonly<Record<string, never>>, CapacitySlotSortField>,
      )
    },

    async releaseReservation(
      inputRecord: ReleaseCapacityReservationInput,
    ): Promise<CapacityReservationRecord> {
      let nextReservation: CapacityReservationRecord | null = null

      await input.firestore.runTransaction(async (transaction) => {
        const reservationRef = reservations.doc(inputRecord.reservationId)
        const reservationSnapshot = await transaction.get(reservationRef)

        if (!reservationSnapshot.exists) {
          throw new Error(`CapacityReservation ${inputRecord.reservationId} was not found`)
        }

        const currentReservation = fromFirestoreReservationDocument(
          reservationSnapshot.data() as FirestoreCapacityReservationDocument,
        )

        if (currentReservation.status !== 'ACTIVE') {
          nextReservation = currentReservation
          return
        }

        const slotRef = slots.doc(currentReservation.slotId)
        const slotSnapshot = await transaction.get(slotRef)
        if (!slotSnapshot.exists) {
          throw new Error(`CapacitySlot ${currentReservation.slotId} was not found`)
        }

        const currentSlot = fromFirestoreSlotDocument(
          slotSnapshot.data() as FirestoreCapacitySlotDocument,
        )
        if (currentSlot.reservedUnits < currentReservation.units) {
          throw new CapacityUnavailableError('capacity slot accounting underflow', ['reservationId'])
        }

        const now = input.clock.now()
        const releasedReservation: CapacityReservationRecord = Object.freeze({
          ...currentReservation,
          releaseReason: inputRecord.reason,
          releasedAt: now,
          status: inputRecord.reason === 'EXPIRED' ? 'EXPIRED' : 'RELEASED',
          updatedAt: now,
          updatedBy: inputRecord.actorUserId ?? null,
          version: currentReservation.version + 1,
        })
        const releasedSlot: CapacitySlotRecord = Object.freeze({
          ...currentSlot,
          reservedUnits: currentSlot.reservedUnits - currentReservation.units,
          updatedAt: now,
          updatedBy: inputRecord.actorUserId ?? null,
          version: currentSlot.version + 1,
        })

        transaction.set(reservationRef, toFirestoreReservationDocument(releasedReservation))
        transaction.set(slotRef, toFirestoreSlotDocument(releasedSlot))
        nextReservation = releasedReservation
      })

      if (!nextReservation) {
        throw new Error('Capacity reservation release transaction did not produce a result')
      }

      return cloneRecord(nextReservation)
    },

    async reopenSlot(command: ReopenCapacitySlotInput) {
      let nextSlot: CapacitySlotRecord | null = null
      let nextClosure: CapacityClosureRecord | null = null

      await input.firestore.runTransaction(async (transaction) => {
        const slotRef = slots.doc(command.slotId)
        const activeClosureRef = activeClosures.doc(command.slotId)
        const [slotSnapshot, activeClosureSnapshot] = await Promise.all([
          transaction.get(slotRef),
          transaction.get(activeClosureRef),
        ])

        if (!slotSnapshot.exists) {
          throw new Error(`CapacitySlot ${command.slotId} was not found`)
        }

        const currentSlot = fromFirestoreSlotDocument(
          slotSnapshot.data() as FirestoreCapacitySlotDocument,
        )

        if (currentSlot.version !== command.slotExpectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: currentSlot.version,
            entityId: currentSlot.id,
            entityName: 'CapacitySlot',
            expectedVersion: command.slotExpectedVersion,
          })
        }

        if (!activeClosureSnapshot.exists) {
          throw new CapacityUnavailableError('capacity slot is not closed', ['slotId'])
        }

        const activeClosureDocument = activeClosureSnapshot.data() as ActiveClosureDocument
        const closureRef = closures.doc(activeClosureDocument.closureId)
        const closureSnapshot = await transaction.get(closureRef)
        if (!closureSnapshot.exists) {
          throw new Error(`CapacityClosure ${activeClosureDocument.closureId} was not found`)
        }

        const currentClosure = fromFirestoreClosureDocument(
          closureSnapshot.data() as FirestoreCapacityClosureDocument,
        )
        const now = input.clock.now()

        nextSlot = Object.freeze({
          ...currentSlot,
          status: currentClosure.reopenStatus,
          updatedAt: now,
          updatedBy: command.actorUserId ?? null,
          version: currentSlot.version + 1,
        })
        nextClosure = Object.freeze({
          ...currentClosure,
          releasedAt: now,
          status: 'RELEASED',
          updatedAt: now,
          updatedBy: command.actorUserId ?? null,
          version: currentClosure.version + 1,
        })

        transaction.set(slotRef, toFirestoreSlotDocument(nextSlot))
        transaction.set(closureRef, toFirestoreClosureDocument(nextClosure))
        transaction.delete(activeClosureRef)
      })

      if (!nextClosure || !nextSlot) {
        throw new Error('Capacity slot reopen transaction did not produce a result')
      }

      return Object.freeze({
        closure: cloneRecord(nextClosure),
        slot: cloneRecord(nextSlot),
      })
    },

    async reserve(inputRecord: ReserveCapacityInput): Promise<CapacityReservationRecord> {
      const normalizedIdempotencyKey = inputRecord.idempotencyKey.trim()
      if (!normalizedIdempotencyKey) {
        throw new IdempotencyConflictError('idempotencyKey is required')
      }

      let nextReservation: CapacityReservationRecord | null = null
      const key = createReservationKey(inputRecord.providerProfileId, normalizedIdempotencyKey)

      await input.firestore.runTransaction(async (transaction) => {
        const slotRef = slots.doc(inputRecord.slotId)
        const keyRef = reservationKeys.doc(key)
        const [slotSnapshot, keySnapshot] = await Promise.all([
          transaction.get(slotRef),
          transaction.get(keyRef),
        ])

        if (!slotSnapshot.exists) {
          throw new Error(`CapacitySlot ${inputRecord.slotId} was not found`)
        }

        if (keySnapshot.exists) {
          const keyDocument = keySnapshot.data() as ReservationKeyDocument
          const reservationRef = reservations.doc(keyDocument.reservationId)
          const reservationSnapshot = await transaction.get(reservationRef)
          if (!reservationSnapshot.exists) {
            throw new Error(`CapacityReservation ${keyDocument.reservationId} was not found`)
          }

          const existingReservation = fromFirestoreReservationDocument(
            reservationSnapshot.data() as FirestoreCapacityReservationDocument,
          )
          if (existingReservation.requestHash !== inputRecord.requestHash) {
            throw new IdempotencyConflictError(
              'idempotency key was already used for another request',
            )
          }

          nextReservation = existingReservation
          return
        }

        const currentSlot = fromFirestoreSlotDocument(
          slotSnapshot.data() as FirestoreCapacitySlotDocument,
        )
        if (
          currentSlot.providerProfileId !== inputRecord.providerProfileId ||
          currentSlot.printerId !== inputRecord.printerId
        ) {
          throw new CapacityUnavailableError(
            'capacity slot does not match the requested provider or printer',
            ['slotId', 'printerId', 'providerProfileId'],
          )
        }

        if (currentSlot.status !== 'OPEN') {
          throw new CapacityUnavailableError(
            'capacity slot is not available for reservation',
            ['slotId'],
          )
        }

        const units = normalizePositiveInteger('units', inputRecord.units)
        const availableUnits = currentSlot.totalUnits - currentSlot.reservedUnits
        if (availableUnits < units) {
          throw new CapacityUnavailableError(
            'requested units exceed available capacity',
            ['units'],
          )
        }

        const now = input.clock.now()
        nextReservation = Object.freeze({
          createdAt: now,
          createdBy: inputRecord.createdBy ?? null,
          deletedAt: null,
          expiresAt: inputRecord.expiresAt,
          id: inputRecord.id ?? input.uuidGenerator.next(),
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
        const nextSlot: CapacitySlotRecord = Object.freeze({
          ...currentSlot,
          reservedUnits: currentSlot.reservedUnits + units,
          updatedAt: now,
          updatedBy: inputRecord.updatedBy ?? inputRecord.createdBy ?? null,
          version: currentSlot.version + 1,
        })

        transaction.set(slots.doc(currentSlot.id), toFirestoreSlotDocument(nextSlot))
        if (!nextReservation) {
          throw new Error('Capacity reservation creation did not produce a result')
        }

        transaction.set(
          reservations.doc(nextReservation.id),
          toFirestoreReservationDocument(nextReservation),
        )
        transaction.set(keyRef, {
          idempotencyKey: normalizedIdempotencyKey,
          providerProfileId: inputRecord.providerProfileId,
          requestHash: inputRecord.requestHash,
          reservationId: nextReservation.id,
          updatedAt: Timestamp.fromDate(new Date(now)),
        } satisfies ReservationKeyDocument)
      })

      if (!nextReservation) {
        throw new Error('Capacity reservation transaction did not produce a result')
      }

      return cloneRecord(nextReservation)
    },

    async updateSlot(slotRecord: CapacitySlotRecord, expectedVersion: number): Promise<CapacitySlotRecord> {
      let nextSlot: CapacitySlotRecord | null = null

      await input.firestore.runTransaction(async (transaction) => {
        const slotRef = slots.doc(slotRecord.id)
        const currentSnapshot = await transaction.get(slotRef)
        if (!currentSnapshot.exists) {
          throw new Error(`CapacitySlot ${slotRecord.id} was not found`)
        }

        const current = fromFirestoreSlotDocument(
          currentSnapshot.data() as FirestoreCapacitySlotDocument,
        )
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
        if (slotRecord.status === 'CLOSED') {
          const activeClosureSnapshot = await transaction.get(activeClosures.doc(slotRecord.id))
          if (!activeClosureSnapshot.exists) {
            throw new CapacityUnavailableError(
              'closed status must be managed through closure commands',
              ['status'],
            )
          }
        }

        if (slotRecord.reservedUnits > slotRecord.totalUnits) {
          throw new CapacityUnavailableError(
            'reserved units cannot exceed total units',
            ['reservedUnits'],
          )
        }

        nextSlot = Object.freeze({
          ...slotRecord,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          schemaVersion: current.schemaVersion,
          updatedAt: input.clock.now(),
          updatedBy: slotRecord.updatedBy ?? null,
          version: current.version + 1,
        })

        transaction.set(slotRef, toFirestoreSlotDocument(nextSlot))
      })

      if (!nextSlot) {
        throw new Error('Capacity slot update transaction did not produce a result')
      }

      return cloneRecord(nextSlot)
    },
  })
}
