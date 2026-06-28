import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  parseUtcTimestamp,
  type CreateProviderProfileInput,
  type ProviderProfileFilter,
  type ProviderProfileRecord,
  type ProviderProfileRepository,
  type ProviderProfileSortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SortDirection,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'
import { Firestore, Timestamp } from '@google-cloud/firestore'

type FirestoreProviderProfileDocument = Readonly<{
  createdAt: Timestamp
  createdBy: string | null
  deletedAt: Timestamp | null
  id: string
  ownerUserId: string
  publicName: string
  serviceRegion: string | null
  schemaVersion: number
  status: ProviderProfileRecord['status']
  updatedAt: Timestamp
  updatedBy: string | null
  version: number
}>

type OwnerSlotDocument = Readonly<{
  ownerUserId: string
  profileId: string
  updatedAt: Timestamp
}>

type CursorPayload = Readonly<{
  direction: SortDirection
  field: ProviderProfileSortField
  id: Uuidv7
  value: string
}>

type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

type RepositoryOptions = Readonly<{
  collectionPrefix?: string
  clock: ClockPort
  firestore: Firestore
  uuidGenerator: UuidGeneratorPort
}>

function createCollectionName(
  baseName: string,
  prefix?: string,
): string {
  if (!prefix) {
    return baseName
  }

  return `${prefix}_${baseName}`
}

function encodeCursor(payload: CursorPayload): RepositoryCursor {
  return encodeURIComponent(JSON.stringify(payload))
}

function decodeCursor(cursor: RepositoryCursor): CursorPayload {
  const payload = JSON.parse(decodeURIComponent(cursor)) as Partial<CursorPayload>

  if (
    !payload ||
    (payload.direction !== 'asc' && payload.direction !== 'desc') ||
    (payload.field !== 'createdAt' && payload.field !== 'updatedAt') ||
    typeof payload.id !== 'string' ||
    typeof payload.value !== 'string'
  ) {
    throw new TypeError('Invalid repository cursor')
  }

  return {
    direction: payload.direction,
    field: payload.field,
    id: payload.id as Uuidv7,
    value: payload.value,
  }
}

function compareValues(left: string, right: string, direction: SortDirection): number {
  if (left === right) {
    return 0
  }

  if (direction === 'asc') {
    return left < right ? -1 : 1
  }

  return left > right ? -1 : 1
}

function compareRecords(
  left: ProviderProfileRecord,
  right: ProviderProfileRecord,
  field: ProviderProfileSortField,
  direction: SortDirection,
): number {
  const fieldComparison = compareValues(left[field], right[field], direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return left.id.localeCompare(right.id)
}

function compareRecordToCursor(record: ProviderProfileRecord, cursor: CursorPayload): number {
  const fieldComparison = compareValues(record[cursor.field], cursor.value, cursor.direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return record.id.localeCompare(cursor.id)
}

function toTimestamp(value: UtcTimestamp | null): Timestamp | null {
  return value ? Timestamp.fromDate(new Date(value)) : null
}

function toTimestampString(value: Timestamp | null): UtcTimestamp | null {
  return value ? parseUtcTimestamp(value.toDate()) : null
}

function cloneRecord(record: ProviderProfileRecord): ProviderProfileRecord {
  return Object.freeze({ ...record })
}

function toFirestoreDocument(
  record: ProviderProfileRecord,
): FirestoreProviderProfileDocument {
  return Object.freeze({
    createdAt: Timestamp.fromDate(new Date(record.createdAt)),
    createdBy: record.createdBy ?? null,
    deletedAt: toTimestamp(record.deletedAt),
    id: record.id,
    ownerUserId: record.ownerUserId,
    publicName: record.publicName,
    serviceRegion: record.serviceRegion,
    schemaVersion: record.schemaVersion,
    status: record.status,
    updatedAt: Timestamp.fromDate(new Date(record.updatedAt)),
    updatedBy: record.updatedBy ?? null,
    version: record.version,
  })
}

function fromFirestoreDocument(
  input: FirestoreProviderProfileDocument,
): ProviderProfileRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp(input.createdAt.toDate()),
    createdBy: (input.createdBy as Uuidv7 | null) ?? null,
    deletedAt: toTimestampString(input.deletedAt),
    id: input.id as Uuidv7,
    ownerUserId: input.ownerUserId as Uuidv7,
    publicName: input.publicName,
    serviceRegion: input.serviceRegion ?? null,
    schemaVersion: input.schemaVersion,
    status: input.status,
    updatedAt: parseUtcTimestamp(input.updatedAt.toDate()),
    updatedBy: (input.updatedBy as Uuidv7 | null) ?? null,
    version: input.version,
  })
}

function getProfilesCollection(
  firestore: Firestore,
  prefix?: string,
) {
  return firestore.collection(createCollectionName('provider_profiles', prefix))
}

function getOwnerSlotsCollection(
  firestore: Firestore,
  prefix?: string,
) {
  return firestore.collection(
    createCollectionName('provider_profile_owner_slots', prefix),
  )
}

async function loadAllRecords(
  firestore: Firestore,
  prefix?: string,
): Promise<readonly ProviderProfileRecord[]> {
  const snapshot = await getProfilesCollection(firestore, prefix).get()

  return snapshot.docs.map((document) =>
    fromFirestoreDocument(document.data() as FirestoreProviderProfileDocument),
  )
}

export function createFirestoreProviderProfileRepository(
  input: RepositoryOptions,
): ProviderProfileRepository {
  const profiles = getProfilesCollection(input.firestore, input.collectionPrefix)
  const ownerSlots = getOwnerSlotsCollection(input.firestore, input.collectionPrefix)

  return Object.freeze({
    async create(createInput: CreateProviderProfileInput): Promise<ProviderProfileRecord> {
      const id = createInput.id ?? input.uuidGenerator.next()
      const now = input.clock.now()
      const record: ProviderProfileRecord = Object.freeze({
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deletedAt: null,
        id,
        ownerUserId: createInput.ownerUserId,
        publicName: createInput.publicName,
        serviceRegion: createInput.serviceRegion ?? null,
        schemaVersion: 1,
        status: createInput.status ?? 'DRAFT',
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        version: 1,
      })

      await input.firestore.runTransaction(async (transaction) => {
        const recordRef = profiles.doc(id)
        const ownerSlotRef = ownerSlots.doc(createInput.ownerUserId)
        const [recordSnapshot, ownerSlotSnapshot] = await Promise.all([
          transaction.get(recordRef),
          transaction.get(ownerSlotRef),
        ])

        if (recordSnapshot.exists) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'provider_profiles.id',
            entityName: 'ProviderProfile',
            value: id,
          })
        }

        if (ownerSlotSnapshot.exists) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'provider_profiles.ownerUserId',
            entityName: 'ProviderProfile',
            value: createInput.ownerUserId,
          })
        }

        transaction.create(recordRef, toFirestoreDocument(record))
        transaction.create(
          ownerSlotRef,
          Object.freeze<OwnerSlotDocument>({
            ownerUserId: createInput.ownerUserId,
            profileId: id,
            updatedAt: Timestamp.fromDate(new Date(now)),
          }),
        )
      })

      return cloneRecord(record)
    },

    async findById(
      id: Uuidv7,
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<ProviderProfileRecord | null> {
      const snapshot = await profiles.doc(id).get()

      if (!snapshot.exists) {
        return null
      }

      const record = fromFirestoreDocument(snapshot.data() as FirestoreProviderProfileDocument)

      if (!options?.includeDeleted && record.deletedAt !== null) {
        return null
      }

      return cloneRecord(record)
    },

    async findByOwnerUserId(
      ownerUserId: Uuidv7,
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<ProviderProfileRecord | null> {
      if (!options?.includeDeleted) {
        const slotSnapshot = await ownerSlots.doc(ownerUserId).get()

        if (!slotSnapshot.exists) {
          return null
        }

        const slot = slotSnapshot.data() as OwnerSlotDocument
        const profileSnapshot = await profiles.doc(slot.profileId).get()

        if (!profileSnapshot.exists) {
          return null
        }

        return cloneRecord(
          fromFirestoreDocument(profileSnapshot.data() as FirestoreProviderProfileDocument),
        )
      }

      const records = await loadAllRecords(input.firestore, input.collectionPrefix)
      const matching = records
        .filter((record) => record.ownerUserId === ownerUserId)
        .sort((left, right) => compareRecords(left, right, 'updatedAt', 'desc'))

      return matching[0] ? cloneRecord(matching[0]) : null
    },

    async list(
      request: RepositoryListRequest<ProviderProfileFilter, ProviderProfileSortField>,
    ): Promise<RepositoryListPage<ProviderProfileRecord>> {
      if (request.limit <= 0) {
        throw new RangeError('Repository list limit must be greater than zero')
      }

      const records = (await loadAllRecords(input.firestore, input.collectionPrefix))
        .filter((record) => {
          if (!request.includeDeleted && record.deletedAt !== null) {
            return false
          }

          if (request.filter?.ownerUserId && record.ownerUserId !== request.filter.ownerUserId) {
            return false
          }

        if (request.filter?.status && record.status !== request.filter.status) {
          return false
        }

        if (
          request.filter?.serviceRegion !== undefined &&
          record.serviceRegion !== request.filter.serviceRegion
        ) {
          return false
        }

        return true
      })
        .sort((left, right) =>
          compareRecords(left, right, request.sort.field, request.sort.direction),
        )

      const cursor = request.cursor
      const startIndex = cursor
        ? records.findIndex((record) => compareRecordToCursor(record, decodeCursor(cursor)) > 0)
        : 0

      const normalizedStartIndex = startIndex < 0 ? records.length : startIndex
      const pageItems = records.slice(normalizedStartIndex, normalizedStartIndex + request.limit)
      const nextItem = records[normalizedStartIndex + request.limit]
      const lastItem = pageItems[pageItems.length - 1]

      return {
        items: pageItems.map((record) => cloneRecord(record)),
        nextCursor:
          nextItem && lastItem
            ? encodeCursor({
                direction: request.sort.direction,
                field: request.sort.field,
                id: lastItem.id,
                value: lastItem[request.sort.field],
              })
            : null,
      }
    },

    async softDelete(
      id: Uuidv7,
      expectedVersion: number,
      deletedBy?: Uuidv7 | null,
    ): Promise<ProviderProfileRecord> {
      return input.firestore.runTransaction(async (transaction) => {
        const recordRef = profiles.doc(id)
        const snapshot = await transaction.get(recordRef)

        if (!snapshot.exists) {
          throw new Error(`ProviderProfile ${id} was not found`)
        }

        const current = fromFirestoreDocument(snapshot.data() as FirestoreProviderProfileDocument)

        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'ProviderProfile',
            expectedVersion,
          })
        }

        const now = input.clock.now()
        const updated: ProviderProfileRecord = Object.freeze({
          ...current,
          deletedAt: now,
          updatedAt: now,
          updatedBy: deletedBy ?? current.updatedBy ?? null,
          version: current.version + 1,
        })

        transaction.set(recordRef, toFirestoreDocument(updated))
        transaction.delete(ownerSlots.doc(current.ownerUserId))

        return cloneRecord(updated)
      })
    },

    async update(
      profile: ProviderProfileRecord,
      expectedVersion: number,
    ): Promise<ProviderProfileRecord> {
      return input.firestore.runTransaction(async (transaction) => {
        const recordRef = profiles.doc(profile.id)
        const snapshot = await transaction.get(recordRef)

        if (!snapshot.exists) {
          throw new Error(`ProviderProfile ${profile.id} was not found`)
        }

        const current = fromFirestoreDocument(snapshot.data() as FirestoreProviderProfileDocument)

        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'ProviderProfile',
            expectedVersion,
          })
        }

        const nextOwnerUserId = profile.ownerUserId
        const ownerChanged = current.ownerUserId !== nextOwnerUserId
        const nextOwnerSlotRef = ownerSlots.doc(nextOwnerUserId)

        if (ownerChanged) {
          const nextOwnerSlotSnapshot = await transaction.get(nextOwnerSlotRef)

          if (nextOwnerSlotSnapshot.exists) {
            throw new RepositoryUniqueConstraintError({
              constraintName: 'provider_profiles.ownerUserId',
              entityName: 'ProviderProfile',
              value: nextOwnerUserId,
            })
          }
        }

        const now = input.clock.now()
        const updated: ProviderProfileRecord = Object.freeze({
          ...profile,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          id: current.id,
          schemaVersion: current.schemaVersion,
          updatedAt: now,
          updatedBy: profile.updatedBy ?? null,
          version: current.version + 1,
        })

        transaction.set(recordRef, toFirestoreDocument(updated))

        if (ownerChanged) {
          transaction.delete(ownerSlots.doc(current.ownerUserId))
          transaction.create(
            nextOwnerSlotRef,
            Object.freeze<OwnerSlotDocument>({
              ownerUserId: nextOwnerUserId,
              profileId: current.id,
              updatedAt: Timestamp.fromDate(new Date(now)),
            }),
          )
        } else {
          transaction.set(
            nextOwnerSlotRef,
            Object.freeze<OwnerSlotDocument>({
              ownerUserId: nextOwnerUserId,
              profileId: current.id,
              updatedAt: Timestamp.fromDate(new Date(now)),
            }),
          )
        }

        return cloneRecord(updated)
      })
    },
  })
}
