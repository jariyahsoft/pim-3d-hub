import type { CanonicalRecord, RepositoryListPage, RepositoryListRequest } from './repository.js'
import type { DimensionsMm, Uuidv7 } from './index.js'

export const printerCatalogVersion = 1

export const printerTechnologyCodes = ['FDM', 'SLA', 'SLS'] as const
export const printerMaterialCodes = ['ABS', 'PA12', 'PETG', 'PLA', 'RESIN', 'TPU'] as const
export const printerColorCodes = ['BLACK', 'BLUE', 'CLEAR', 'NATURAL', 'RED', 'WHITE'] as const
export const printerQualityCodes = ['DRAFT', 'STANDARD', 'FINE'] as const

export const printerTechnologyMaterialCompatibility: Record<
  PrinterTechnologyCode,
  readonly PrinterMaterialCode[]
> = {
  FDM: ['ABS', 'PETG', 'PLA', 'TPU'],
  SLA: ['RESIN'],
  SLS: ['PA12'],
}

export const printerStatuses = ['DRAFT', 'ACTIVE', 'DISABLED'] as const
export const printerCapabilityStatuses = ['DRAFT', 'ACTIVE', 'DISABLED'] as const
export const providerMaterialStockStatuses = ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISABLED'] as const

export type PrinterTechnologyCode = (typeof printerTechnologyCodes)[number]
export type PrinterMaterialCode = (typeof printerMaterialCodes)[number]
export type PrinterColorCode = (typeof printerColorCodes)[number]
export type PrinterQualityCode = (typeof printerQualityCodes)[number]
export type PrinterStatus = (typeof printerStatuses)[number]
export type PrinterCapabilityStatus = (typeof printerCapabilityStatuses)[number]
export type ProviderMaterialStockStatus = (typeof providerMaterialStockStatuses)[number]

export type PrinterSortField = 'createdAt' | 'updatedAt'
export type PrinterCapabilitySortField = 'createdAt' | 'updatedAt'
export type ProviderMaterialSortField = 'createdAt' | 'updatedAt'

export type PrinterRecord = Readonly<
  CanonicalRecord & {
    buildVolumeMm: DimensionsMm
    modelCode: string
    providerProfileId: Uuidv7
    quantity: number
    status: PrinterStatus
    technologyCode: PrinterTechnologyCode
  }
>

export type CreatePrinterInput = Readonly<{
  buildVolumeMm: DimensionsMm
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  modelCode: string
  providerProfileId: Uuidv7
  quantity: number
  status?: PrinterStatus
  technologyCode: PrinterTechnologyCode
  updatedBy?: Uuidv7 | null
}>

export type PrinterFilter = Readonly<{
  providerProfileId?: Uuidv7
  status?: PrinterStatus
  technologyCode?: PrinterTechnologyCode
}>

export type PrinterCapabilityRecord = Readonly<
  CanonicalRecord & {
    materialCode: PrinterMaterialCode
    printerId: Uuidv7
    qualityCode: PrinterQualityCode
    status: PrinterCapabilityStatus
  }
>

export type CreatePrinterCapabilityInput = Readonly<{
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  materialCode: PrinterMaterialCode
  printerId: Uuidv7
  qualityCode: PrinterQualityCode
  status?: PrinterCapabilityStatus
  updatedBy?: Uuidv7 | null
}>

export type PrinterCapabilityFilter = Readonly<{
  printerId?: Uuidv7
  status?: PrinterCapabilityStatus
}>

export type ProviderMaterialRecord = Readonly<
  CanonicalRecord & {
    colorCode: PrinterColorCode
    materialCode: PrinterMaterialCode
    providerProfileId: Uuidv7
    quantityGrams: number
    stockStatus: ProviderMaterialStockStatus
  }
>

export type CreateProviderMaterialInput = Readonly<{
  colorCode: PrinterColorCode
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  materialCode: PrinterMaterialCode
  providerProfileId: Uuidv7
  quantityGrams: number
  stockStatus?: ProviderMaterialStockStatus
  updatedBy?: Uuidv7 | null
}>

export type ProviderMaterialFilter = Readonly<{
  materialCode?: PrinterMaterialCode
  providerProfileId?: Uuidv7
  stockStatus?: ProviderMaterialStockStatus
}>

export type PrinterRepository = Readonly<{
  create(input: CreatePrinterInput): Promise<PrinterRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<PrinterRecord | null>
  list(
    request: RepositoryListRequest<PrinterFilter, PrinterSortField>,
  ): Promise<RepositoryListPage<PrinterRecord>>
  softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<PrinterRecord>
  update(printer: PrinterRecord, expectedVersion: number): Promise<PrinterRecord>
}>

export type PrinterCapabilityRepository = Readonly<{
  create(input: CreatePrinterCapabilityInput): Promise<PrinterCapabilityRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<PrinterCapabilityRecord | null>
  list(
    request: RepositoryListRequest<PrinterCapabilityFilter, PrinterCapabilitySortField>,
  ): Promise<RepositoryListPage<PrinterCapabilityRecord>>
  softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<PrinterCapabilityRecord>
  update(
    capability: PrinterCapabilityRecord,
    expectedVersion: number,
  ): Promise<PrinterCapabilityRecord>
}>

export type ProviderMaterialRepository = Readonly<{
  create(input: CreateProviderMaterialInput): Promise<ProviderMaterialRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<ProviderMaterialRecord | null>
  list(
    request: RepositoryListRequest<ProviderMaterialFilter, ProviderMaterialSortField>,
  ): Promise<RepositoryListPage<ProviderMaterialRecord>>
  softDelete(
    id: Uuidv7,
    expectedVersion: number,
    deletedBy?: Uuidv7 | null,
  ): Promise<ProviderMaterialRecord>
  update(
    material: ProviderMaterialRecord,
    expectedVersion: number,
  ): Promise<ProviderMaterialRecord>
}>

export function isTechnologyMaterialCompatible(
  technologyCode: PrinterTechnologyCode,
  materialCode: PrinterMaterialCode,
): boolean {
  return printerTechnologyMaterialCompatibility[technologyCode].includes(materialCode)
}
