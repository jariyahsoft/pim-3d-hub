import {
  RepositoryConflictError,
  RepositoryUniqueConstraintError,
  parseUtcTimestamp,
  type CreatePrinterCapabilityInput,
  type CreatePrinterInput,
  type CreateProviderMaterialInput,
  type PrinterCapabilityFilter,
  type PrinterCapabilityRecord,
  type PrinterCapabilityRepository,
  type PrinterCapabilitySortField,
  type PrinterFilter,
  type PrinterRecord,
  type PrinterRepository,
  type PrinterSortField,
  type ProviderMaterialFilter,
  type ProviderMaterialRecord,
  type ProviderMaterialRepository,
  type ProviderMaterialSortField,
  type RepositoryCursor,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SortDirection,
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
    ? filtered.findIndex((record) => compareRecordToCursor(record, decodeCursor(cursor, [request.sort.field])) > 0)
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

function createRepositoryNotFoundError(entityName: string, id: Uuidv7): Error {
  return new Error(`${entityName} ${id} was not found`)
}

function normalizePositiveInteger(field: string, value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be greater than zero`)
  }

  return value
}

export type InMemoryPrinterRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: PrinterRepository
  uuidGenerator: UuidGeneratorPort
}>

export type InMemoryPrinterCapabilityRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: PrinterCapabilityRepository
  uuidGenerator: UuidGeneratorPort
}>

export type InMemoryProviderMaterialRepositoryHarness = Readonly<{
  clock: ClockPort
  repository: ProviderMaterialRepository
  uuidGenerator: UuidGeneratorPort
}>

export function createInMemoryPrinterRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryPrinterRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, PrinterRecord>()
  const slots = new Map<string, Uuidv7>()

  function createKey(providerProfileId: Uuidv7, modelCode: string): string {
    return `${providerProfileId}:${modelCode}`
  }

  function findByKey(providerProfileId: Uuidv7, modelCode: string): PrinterRecord | null {
    const id = slots.get(createKey(providerProfileId, modelCode))
    if (!id) {
      return null
    }

    const record = records.get(id)
    if (!record || record.deletedAt !== null) {
      return null
    }

    return record
  }

  function ensureUniqueSlot(
    providerProfileId: Uuidv7,
    modelCode: string,
    currentId?: Uuidv7,
  ): void {
    const existing = findByKey(providerProfileId, modelCode)
    if (existing && existing.id !== currentId) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'printers.providerProfileId_modelCode',
        entityName: 'Printer',
        value: createKey(providerProfileId, modelCode),
      })
    }
  }

  function requireActiveRecord(id: Uuidv7): PrinterRecord {
    const record = records.get(id)

    if (!record || record.deletedAt !== null) {
      throw createRepositoryNotFoundError('Printer', id)
    }

    return record
  }

  async function create(inputRecord: CreatePrinterInput): Promise<PrinterRecord> {
    const id = inputRecord.id ?? uuidGenerator.next()
    const modelCode = inputRecord.modelCode.trim()
    const quantity = normalizePositiveInteger('quantity', inputRecord.quantity)
    const key = createKey(inputRecord.providerProfileId, modelCode)

    if (records.has(id)) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'printers.id',
        entityName: 'Printer',
        value: id,
      })
    }

    ensureUniqueSlot(inputRecord.providerProfileId, modelCode)

    const now = clock.now()
    const record: PrinterRecord = Object.freeze({
      buildVolumeMm: inputRecord.buildVolumeMm,
      createdAt: now,
      createdBy: inputRecord.createdBy ?? null,
      deletedAt: null,
      id,
      modelCode,
      providerProfileId: inputRecord.providerProfileId,
      quantity,
      schemaVersion: 1,
      status: inputRecord.status ?? 'DRAFT',
      technologyCode: inputRecord.technologyCode,
      updatedAt: now,
      updatedBy: inputRecord.updatedBy ?? inputRecord.createdBy ?? null,
      version: 1,
    })

    records.set(record.id, record)
    slots.set(key, record.id)
    return cloneRecord(record)
  }

  async function findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<PrinterRecord | null> {
    const record = records.get(id)
    if (!record) {
      return null
    }
    if (!options?.includeDeleted && record.deletedAt !== null) {
      return null
    }
    return cloneRecord(record)
  }

  async function list(
    request: RepositoryListRequest<PrinterFilter, PrinterSortField>,
  ): Promise<RepositoryListPage<PrinterRecord>> {
    if (request.limit <= 0) {
      throw new RangeError('Repository list limit must be greater than zero')
    }

    const filtered = [...records.values()].filter((record) => {
      if (!request.includeDeleted && record.deletedAt !== null) {
        return false
      }

      if (request.filter?.providerProfileId && record.providerProfileId !== request.filter.providerProfileId) {
        return false
      }

      if (request.filter?.status && record.status !== request.filter.status) {
        return false
      }

      if (request.filter?.technologyCode && record.technologyCode !== request.filter.technologyCode) {
        return false
      }

      return true
    })

    return createListPage(filtered, request as RepositoryListRequest<Readonly<Record<string, never>>, PrinterSortField>)
  }

  async function softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<PrinterRecord> {
    const current = requireActiveRecord(id)

    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'Printer',
        expectedVersion,
      })
    }

    const next = Object.freeze({
      ...current,
      deletedAt: clock.now(),
      updatedAt: clock.now(),
      updatedBy: deletedBy ?? current.updatedBy ?? null,
      version: current.version + 1,
    })

    records.set(next.id, next)
    slots.delete(createKey(current.providerProfileId, current.modelCode))
    return cloneRecord(next)
  }

  async function update(printer: PrinterRecord, expectedVersion: number): Promise<PrinterRecord> {
    const current = requireActiveRecord(printer.id)
    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'Printer',
        expectedVersion,
      })
    }

    const nextKey = createKey(printer.providerProfileId, printer.modelCode)
    const currentKey = createKey(current.providerProfileId, current.modelCode)
    if (nextKey !== currentKey) {
      ensureUniqueSlot(printer.providerProfileId, printer.modelCode, printer.id)
      slots.delete(currentKey)
      slots.set(nextKey, printer.id)
    }

    const next = Object.freeze({
      ...printer,
      updatedAt: clock.now(),
      version: current.version + 1,
    })

    records.set(next.id, next)
    return cloneRecord(next)
  }

  return {
    clock,
    repository: {
      create,
      findById,
      list,
      softDelete,
      update,
    },
    uuidGenerator,
  }
}

export function createInMemoryPrinterCapabilityRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryPrinterCapabilityRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, PrinterCapabilityRecord>()
  const slots = new Map<string, Uuidv7>()

  function createKey(printerId: Uuidv7, materialCode: string, qualityCode: string): string {
    return `${printerId}:${materialCode}:${qualityCode}`
  }

  function findByKey(printerId: Uuidv7, materialCode: string, qualityCode: string): PrinterCapabilityRecord | null {
    const id = slots.get(createKey(printerId, materialCode, qualityCode))
    if (!id) {
      return null
    }

    const record = records.get(id)
    if (!record || record.deletedAt !== null) {
      return null
    }

    return record
  }

  function ensureUniqueSlot(
    printerId: Uuidv7,
    materialCode: string,
    qualityCode: string,
    currentId?: Uuidv7,
  ): void {
    const existing = findByKey(printerId, materialCode, qualityCode)
    if (existing && existing.id !== currentId) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'printer_capabilities.printerId_materialCode_qualityCode',
        entityName: 'PrinterCapability',
        value: createKey(printerId, materialCode, qualityCode),
      })
    }
  }

  function requireActiveRecord(id: Uuidv7): PrinterCapabilityRecord {
    const record = records.get(id)
    if (!record || record.deletedAt !== null) {
      throw createRepositoryNotFoundError('PrinterCapability', id)
    }
    return record
  }

  async function create(inputRecord: CreatePrinterCapabilityInput): Promise<PrinterCapabilityRecord> {
    const id = inputRecord.id ?? uuidGenerator.next()
    const key = createKey(inputRecord.printerId, inputRecord.materialCode, inputRecord.qualityCode)

    if (records.has(id)) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'printer_capabilities.id',
        entityName: 'PrinterCapability',
        value: id,
      })
    }

    ensureUniqueSlot(inputRecord.printerId, inputRecord.materialCode, inputRecord.qualityCode)

    const now = clock.now()
    const record: PrinterCapabilityRecord = Object.freeze({
      createdAt: now,
      createdBy: inputRecord.createdBy ?? null,
      deletedAt: null,
      id,
      materialCode: inputRecord.materialCode,
      printerId: inputRecord.printerId,
      qualityCode: inputRecord.qualityCode,
      schemaVersion: 1,
      status: inputRecord.status ?? 'DRAFT',
      updatedAt: now,
      updatedBy: inputRecord.updatedBy ?? inputRecord.createdBy ?? null,
      version: 1,
    })

    records.set(record.id, record)
    slots.set(key, record.id)
    return cloneRecord(record)
  }

  async function findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<PrinterCapabilityRecord | null> {
    const record = records.get(id)
    if (!record) {
      return null
    }
    if (!options?.includeDeleted && record.deletedAt !== null) {
      return null
    }
    return cloneRecord(record)
  }

  async function list(
    request: RepositoryListRequest<PrinterCapabilityFilter, PrinterCapabilitySortField>,
  ): Promise<RepositoryListPage<PrinterCapabilityRecord>> {
    if (request.limit <= 0) {
      throw new RangeError('Repository list limit must be greater than zero')
    }

    const filtered = [...records.values()].filter((record) => {
      if (!request.includeDeleted && record.deletedAt !== null) {
        return false
      }
      if (request.filter?.printerId && record.printerId !== request.filter.printerId) {
        return false
      }
      if (request.filter?.status && record.status !== request.filter.status) {
        return false
      }
      return true
    })

    return createListPage(filtered, request as RepositoryListRequest<Readonly<Record<string, never>>, PrinterCapabilitySortField>)
  }

  async function softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<PrinterCapabilityRecord> {
    const current = requireActiveRecord(id)
    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'PrinterCapability',
        expectedVersion,
      })
    }

    const next = Object.freeze({
      ...current,
      deletedAt: clock.now(),
      updatedAt: clock.now(),
      updatedBy: deletedBy ?? current.updatedBy ?? null,
      version: current.version + 1,
    })

    records.set(next.id, next)
    slots.delete(createKey(current.printerId, current.materialCode, current.qualityCode))
    return cloneRecord(next)
  }

  async function update(
    capability: PrinterCapabilityRecord,
    expectedVersion: number,
  ): Promise<PrinterCapabilityRecord> {
    const current = requireActiveRecord(capability.id)
    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'PrinterCapability',
        expectedVersion,
      })
    }

    const nextKey = createKey(capability.printerId, capability.materialCode, capability.qualityCode)
    const currentKey = createKey(current.printerId, current.materialCode, current.qualityCode)
    if (nextKey !== currentKey) {
      ensureUniqueSlot(capability.printerId, capability.materialCode, capability.qualityCode, capability.id)
      slots.delete(currentKey)
      slots.set(nextKey, capability.id)
    }

    const next = Object.freeze({
      ...capability,
      updatedAt: clock.now(),
      version: current.version + 1,
    })

    records.set(next.id, next)
    return cloneRecord(next)
  }

  return {
    clock,
    repository: {
      create,
      findById,
      list,
      softDelete,
      update,
    },
    uuidGenerator,
  }
}

export function createInMemoryProviderMaterialRepository(input?: {
  clock?: ClockPort
  uuidGenerator?: UuidGeneratorPort
}): InMemoryProviderMaterialRepositoryHarness {
  const clock = input?.clock ?? createFakeClock()
  const uuidGenerator = input?.uuidGenerator ?? createFakeUuidGenerator()
  const records = new Map<Uuidv7, ProviderMaterialRecord>()
  const slots = new Map<string, Uuidv7>()

  function createKey(providerProfileId: Uuidv7, materialCode: string, colorCode: string): string {
    return `${providerProfileId}:${materialCode}:${colorCode}`
  }

  function findByKey(providerProfileId: Uuidv7, materialCode: string, colorCode: string): ProviderMaterialRecord | null {
    const id = slots.get(createKey(providerProfileId, materialCode, colorCode))
    if (!id) {
      return null
    }

    const record = records.get(id)
    if (!record || record.deletedAt !== null) {
      return null
    }

    return record
  }

  function ensureUniqueSlot(
    providerProfileId: Uuidv7,
    materialCode: string,
    colorCode: string,
    currentId?: Uuidv7,
  ): void {
    const existing = findByKey(providerProfileId, materialCode, colorCode)
    if (existing && existing.id !== currentId) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'provider_materials.providerProfileId_materialCode_colorCode',
        entityName: 'ProviderMaterial',
        value: createKey(providerProfileId, materialCode, colorCode),
      })
    }
  }

  function requireActiveRecord(id: Uuidv7): ProviderMaterialRecord {
    const record = records.get(id)
    if (!record || record.deletedAt !== null) {
      throw createRepositoryNotFoundError('ProviderMaterial', id)
    }
    return record
  }

  async function create(inputRecord: CreateProviderMaterialInput): Promise<ProviderMaterialRecord> {
    const id = inputRecord.id ?? uuidGenerator.next()
    const quantityGrams = normalizePositiveInteger('quantityGrams', inputRecord.quantityGrams)
    const key = createKey(inputRecord.providerProfileId, inputRecord.materialCode, inputRecord.colorCode)

    if (records.has(id)) {
      throw new RepositoryUniqueConstraintError({
        constraintName: 'provider_materials.id',
        entityName: 'ProviderMaterial',
        value: id,
      })
    }

    ensureUniqueSlot(inputRecord.providerProfileId, inputRecord.materialCode, inputRecord.colorCode)

    const now = clock.now()
    const record: ProviderMaterialRecord = Object.freeze({
      colorCode: inputRecord.colorCode,
      createdAt: now,
      createdBy: inputRecord.createdBy ?? null,
      deletedAt: null,
      id,
      materialCode: inputRecord.materialCode,
      providerProfileId: inputRecord.providerProfileId,
      quantityGrams,
      schemaVersion: 1,
      stockStatus: inputRecord.stockStatus ?? 'IN_STOCK',
      updatedAt: now,
      updatedBy: inputRecord.updatedBy ?? inputRecord.createdBy ?? null,
      version: 1,
    })

    records.set(record.id, record)
    slots.set(key, record.id)
    return cloneRecord(record)
  }

  async function findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<ProviderMaterialRecord | null> {
    const record = records.get(id)
    if (!record) {
      return null
    }
    if (!options?.includeDeleted && record.deletedAt !== null) {
      return null
    }
    return cloneRecord(record)
  }

  async function list(
    request: RepositoryListRequest<ProviderMaterialFilter, ProviderMaterialSortField>,
  ): Promise<RepositoryListPage<ProviderMaterialRecord>> {
    if (request.limit <= 0) {
      throw new RangeError('Repository list limit must be greater than zero')
    }

    const filtered = [...records.values()].filter((record) => {
      if (!request.includeDeleted && record.deletedAt !== null) {
        return false
      }
      if (request.filter?.providerProfileId && record.providerProfileId !== request.filter.providerProfileId) {
        return false
      }
      if (request.filter?.materialCode && record.materialCode !== request.filter.materialCode) {
        return false
      }
      if (request.filter?.stockStatus && record.stockStatus !== request.filter.stockStatus) {
        return false
      }
      return true
    })

    return createListPage(filtered, request as RepositoryListRequest<Readonly<Record<string, never>>, ProviderMaterialSortField>)
  }

  async function softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<ProviderMaterialRecord> {
    const current = requireActiveRecord(id)
    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'ProviderMaterial',
        expectedVersion,
      })
    }

    const next = Object.freeze({
      ...current,
      deletedAt: clock.now(),
      updatedAt: clock.now(),
      updatedBy: deletedBy ?? current.updatedBy ?? null,
      version: current.version + 1,
    })

    records.set(next.id, next)
    slots.delete(createKey(current.providerProfileId, current.materialCode, current.colorCode))
    return cloneRecord(next)
  }

  async function update(
    material: ProviderMaterialRecord,
    expectedVersion: number,
  ): Promise<ProviderMaterialRecord> {
    const current = requireActiveRecord(material.id)
    if (current.version !== expectedVersion) {
      throw new RepositoryConflictError({
        actualVersion: current.version,
        entityId: current.id,
        entityName: 'ProviderMaterial',
        expectedVersion,
      })
    }

    const nextKey = createKey(material.providerProfileId, material.materialCode, material.colorCode)
    const currentKey = createKey(current.providerProfileId, current.materialCode, current.colorCode)
    if (nextKey !== currentKey) {
      ensureUniqueSlot(material.providerProfileId, material.materialCode, material.colorCode, material.id)
      slots.delete(currentKey)
      slots.set(nextKey, material.id)
    }

    const next = Object.freeze({
      ...material,
      updatedAt: clock.now(),
      version: current.version + 1,
    })

    records.set(next.id, next)
    return cloneRecord(next)
  }

  return {
    clock,
    repository: {
      create,
      findById,
      list,
      softDelete,
      update,
    },
    uuidGenerator,
  }
}
