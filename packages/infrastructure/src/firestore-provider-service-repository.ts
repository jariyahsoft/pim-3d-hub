import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  parseUtcTimestamp,
  type CreateProviderServiceInput,
  type ProviderServiceFilter,
  type ProviderServiceRecord,
  type ProviderServiceRepository,
  type ProviderServiceSortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SortDirection,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'
import { Firestore, Timestamp } from '@google-cloud/firestore'

type FirestoreProviderServiceDocument = Readonly<{
  createdAt: Timestamp
  createdBy: string | null
  deletedAt: Timestamp | null
  id: string
  instantOrderEnabled: boolean
  leadTimeDays: number
  providerProfileId: string
  serviceDescription: string
  serviceName: string
  serviceRegion: string | null
  serviceType: ProviderServiceRecord['serviceType']
  schemaVersion: number
  status: ProviderServiceRecord['status']
  updatedAt: Timestamp
  updatedBy: string | null
  version: number
}>

type ServiceSlotDocument = Readonly<{
  providerProfileId: string
  serviceId: string
  serviceType: ProviderServiceRecord['serviceType']
  updatedAt: Timestamp
}>

type CursorPayload = Readonly<{
  direction: SortDirection
  field: ProviderServiceSortField
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
  collectionPrefix?: string
  clock: ClockPort
  firestore: Firestore
  uuidGenerator: UuidGeneratorPort
}>

function createCollectionName(baseName: string, prefix?: string): string {
  return prefix ? `${prefix}_${baseName}` : baseName
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
    (typeof payload.value !== 'string' && typeof payload.value !== 'number')
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

function compareValues(left: string | number, right: string | number, direction: SortDirection): number {
  if (left === right) {
    return 0
  }

  if (direction === 'asc') {
    return left < right ? -1 : 1
  }

  return left > right ? -1 : 1
}

function compareRecords(
  left: ProviderServiceRecord,
  right: ProviderServiceRecord,
  field: ProviderServiceSortField,
  direction: SortDirection,
): number {
  const fieldComparison = compareValues(left[field], right[field], direction)

  if (fieldComparison !== 0) {
    return fieldComparison
  }

  return left.id.localeCompare(right.id)
}

function compareRecordToCursor(record: ProviderServiceRecord, cursor: CursorPayload): number {
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

function cloneRecord(record: ProviderServiceRecord): ProviderServiceRecord {
  return Object.freeze({ ...record })
}

function toFirestoreDocument(record: ProviderServiceRecord): FirestoreProviderServiceDocument {
  return Object.freeze({
    createdAt: Timestamp.fromDate(new Date(record.createdAt)),
    createdBy: record.createdBy ?? null,
    deletedAt: toTimestamp(record.deletedAt),
    id: record.id,
    instantOrderEnabled: record.instantOrderEnabled,
    leadTimeDays: record.leadTimeDays,
    providerProfileId: record.providerProfileId,
    serviceDescription: record.serviceDescription,
    serviceName: record.serviceName,
    serviceRegion: record.serviceRegion,
    serviceType: record.serviceType,
    schemaVersion: record.schemaVersion,
    status: record.status,
    updatedAt: Timestamp.fromDate(new Date(record.updatedAt)),
    updatedBy: record.updatedBy ?? null,
    version: record.version,
  })
}

function fromFirestoreDocument(input: FirestoreProviderServiceDocument): ProviderServiceRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp(input.createdAt.toDate()),
    createdBy: (input.createdBy as Uuidv7 | null) ?? null,
    deletedAt: toTimestampString(input.deletedAt),
    id: input.id as Uuidv7,
    instantOrderEnabled: input.instantOrderEnabled,
    leadTimeDays: input.leadTimeDays,
    providerProfileId: input.providerProfileId as Uuidv7,
    serviceDescription: input.serviceDescription,
    serviceName: input.serviceName,
    serviceRegion: input.serviceRegion ?? null,
    serviceType: input.serviceType,
    schemaVersion: input.schemaVersion,
    status: input.status,
    updatedAt: parseUtcTimestamp(input.updatedAt.toDate()),
    updatedBy: (input.updatedBy as Uuidv7 | null) ?? null,
    version: input.version,
  })
}

function getServicesCollection(firestore: Firestore, prefix?: string) {
  return firestore.collection(createCollectionName('provider_services', prefix))
}

function getServiceSlotsCollection(firestore: Firestore, prefix?: string) {
  return firestore.collection(createCollectionName('provider_service_slots', prefix))
}

function createServiceKey(
  providerProfileId: Uuidv7,
  serviceType: ProviderServiceRecord['serviceType'],
): string {
  return `${providerProfileId}:${serviceType}`
}

async function loadAllRecords(
  firestore: Firestore,
  prefix?: string,
): Promise<readonly ProviderServiceRecord[]> {
  const snapshot = await getServicesCollection(firestore, prefix).get()

  return snapshot.docs.map((document) =>
    fromFirestoreDocument(document.data() as FirestoreProviderServiceDocument),
  )
}

export function createFirestoreProviderServiceRepository(
  input: RepositoryOptions,
): ProviderServiceRepository {
  const services = getServicesCollection(input.firestore, input.collectionPrefix)
  const serviceSlots = getServiceSlotsCollection(input.firestore, input.collectionPrefix)

  return Object.freeze({
    async create(createInput: CreateProviderServiceInput): Promise<ProviderServiceRecord> {
      const id = createInput.id ?? input.uuidGenerator.next()
      const now = input.clock.now()
      const record: ProviderServiceRecord = Object.freeze({
        createdAt: now,
        createdBy: createInput.createdBy ?? null,
        deletedAt: null,
        id,
        instantOrderEnabled: createInput.instantOrderEnabled ?? false,
        leadTimeDays: createInput.leadTimeDays,
        providerProfileId: createInput.providerProfileId,
        serviceDescription: createInput.serviceDescription,
        serviceName: createInput.serviceName,
        serviceRegion: createInput.serviceRegion ?? null,
        serviceType: createInput.serviceType,
        schemaVersion: 1,
        status: createInput.status ?? 'DRAFT',
        updatedAt: now,
        updatedBy: createInput.updatedBy ?? createInput.createdBy ?? null,
        version: 1,
      })

      await input.firestore.runTransaction(async (transaction) => {
        const recordRef = services.doc(id)
        const slotRef = serviceSlots.doc(createServiceKey(record.providerProfileId, record.serviceType))
        const [recordSnapshot, slotSnapshot] = await Promise.all([
          transaction.get(recordRef),
          transaction.get(slotRef),
        ])

        if (recordSnapshot.exists) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'provider_services.id',
            entityName: 'ProviderService',
            value: id,
          })
        }

        if (slotSnapshot.exists) {
          throw new RepositoryUniqueConstraintError({
            constraintName: 'provider_services.providerProfileId_serviceType',
            entityName: 'ProviderService',
            value: createServiceKey(record.providerProfileId, record.serviceType),
          })
        }

        transaction.create(recordRef, toFirestoreDocument(record))
        transaction.create(
          slotRef,
          Object.freeze<ServiceSlotDocument>({
            providerProfileId: record.providerProfileId,
            serviceId: record.id,
            serviceType: record.serviceType,
            updatedAt: Timestamp.fromDate(new Date(now)),
          }),
        )
      })

      return cloneRecord(record)
    },

    async findById(
      id: Uuidv7,
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<ProviderServiceRecord | null> {
      const snapshot = await services.doc(id).get()

      if (!snapshot.exists) {
        return null
      }

      const record = fromFirestoreDocument(snapshot.data() as FirestoreProviderServiceDocument)
      if (!options?.includeDeleted && record.deletedAt !== null) {
        return null
      }

      return cloneRecord(record)
    },

    async findByProviderProfileAndType(
      providerProfileId: Uuidv7,
      serviceType: ProviderServiceRecord['serviceType'],
      options?: Readonly<{ includeDeleted?: boolean }>,
    ): Promise<ProviderServiceRecord | null> {
      if (!options?.includeDeleted) {
        const slotSnapshot = await serviceSlots.doc(createServiceKey(providerProfileId, serviceType)).get()

        if (!slotSnapshot.exists) {
          return null
        }

        const slot = slotSnapshot.data() as ServiceSlotDocument
        const serviceSnapshot = await services.doc(slot.serviceId).get()

        if (!serviceSnapshot.exists) {
          return null
        }

        const record = fromFirestoreDocument(serviceSnapshot.data() as FirestoreProviderServiceDocument)
        return record.deletedAt === null ? cloneRecord(record) : null
      }

      const records = await loadAllRecords(input.firestore, input.collectionPrefix)
      const matching = records
        .filter(
          (record) =>
            record.providerProfileId === providerProfileId && record.serviceType === serviceType,
        )
        .sort((left, right) => compareRecords(left, right, 'updatedAt', 'desc'))

      return matching[0] ? cloneRecord(matching[0]) : null
    },

    async list(
      request: RepositoryListRequest<ProviderServiceFilter, ProviderServiceSortField>,
    ): Promise<RepositoryListPage<ProviderServiceRecord>> {
      if (request.limit <= 0) {
        throw new RangeError('Repository list limit must be greater than zero')
      }

      const records = (await loadAllRecords(input.firestore, input.collectionPrefix))
        .filter((record) => {
          if (!request.includeDeleted && record.deletedAt !== null) {
            return false
          }

          if (
            request.filter?.providerProfileId &&
            record.providerProfileId !== request.filter.providerProfileId
          ) {
            return false
          }

          if (request.filter?.serviceType && record.serviceType !== request.filter.serviceType) {
            return false
          }

          if (request.filter?.status && record.status !== request.filter.status) {
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
    ): Promise<ProviderServiceRecord> {
      return input.firestore.runTransaction(async (transaction) => {
        const recordRef = services.doc(id)
        const snapshot = await transaction.get(recordRef)

        if (!snapshot.exists) {
          throw new Error(`ProviderService ${id} was not found`)
        }

        const current = fromFirestoreDocument(snapshot.data() as FirestoreProviderServiceDocument)

        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'ProviderService',
            expectedVersion,
          })
        }

        const now = input.clock.now()
        const updated: ProviderServiceRecord = Object.freeze({
          ...current,
          deletedAt: now,
          updatedAt: now,
          updatedBy: deletedBy ?? current.updatedBy ?? null,
          version: current.version + 1,
        })

        transaction.set(recordRef, toFirestoreDocument(updated))
        transaction.delete(serviceSlots.doc(createServiceKey(current.providerProfileId, current.serviceType)))

        return cloneRecord(updated)
      })
    },

    async update(
      service: ProviderServiceRecord,
      expectedVersion: number,
    ): Promise<ProviderServiceRecord> {
      return input.firestore.runTransaction(async (transaction) => {
        const recordRef = services.doc(service.id)
        const snapshot = await transaction.get(recordRef)

        if (!snapshot.exists) {
          throw new Error(`ProviderService ${service.id} was not found`)
        }

        const current = fromFirestoreDocument(snapshot.data() as FirestoreProviderServiceDocument)

        if (current.version !== expectedVersion) {
          throw new RepositoryConflictError({
            actualVersion: current.version,
            entityId: current.id,
            entityName: 'ProviderService',
            expectedVersion,
          })
        }

        const nextKey = createServiceKey(service.providerProfileId, service.serviceType)
        const currentKey = createServiceKey(current.providerProfileId, current.serviceType)
        if (nextKey !== currentKey) {
          const slotSnapshot = await transaction.get(serviceSlots.doc(nextKey))
          if (slotSnapshot.exists) {
            throw new RepositoryUniqueConstraintError({
              constraintName: 'provider_services.providerProfileId_serviceType',
              entityName: 'ProviderService',
              value: nextKey,
            })
          }
        }

        const now = input.clock.now()
        const updated: ProviderServiceRecord = Object.freeze({
          ...service,
          createdAt: current.createdAt,
          createdBy: current.createdBy ?? null,
          deletedAt: current.deletedAt,
          id: current.id,
          schemaVersion: current.schemaVersion,
          updatedAt: now,
          updatedBy: service.updatedBy ?? null,
          version: current.version + 1,
        })

        transaction.set(recordRef, toFirestoreDocument(updated))

        if (nextKey !== currentKey) {
          transaction.delete(serviceSlots.doc(currentKey))
          transaction.create(
            serviceSlots.doc(nextKey),
            Object.freeze<ServiceSlotDocument>({
              providerProfileId: updated.providerProfileId,
              serviceId: updated.id,
              serviceType: updated.serviceType,
              updatedAt: Timestamp.fromDate(new Date(now)),
            }),
          )
        } else {
          transaction.set(
            serviceSlots.doc(nextKey),
            Object.freeze<ServiceSlotDocument>({
              providerProfileId: updated.providerProfileId,
              serviceId: updated.id,
              serviceType: updated.serviceType,
              updatedAt: Timestamp.fromDate(new Date(now)),
            }),
          )
        }

        return cloneRecord(updated)
      })
    },
  })
}
