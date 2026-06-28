import {
  AuthorizationDeniedError,
  type UuidGeneratorPort,
} from './identity.js'
import {
  RepositoryConflictError,
  isTechnologyMaterialCompatible,
  parseDimensionsMm,
  type PrinterCapabilityRecord,
  type PrinterCapabilityRepository,
  type PrinterCapabilityStatus,
  type PrinterMaterialCode,
  type PrinterQualityCode,
  type PrinterColorCode,
  type PrinterRecord,
  type PrinterRepository,
  type PrinterStatus,
  type PrinterTechnologyCode,
  type ProviderMaterialRecord,
  type ProviderMaterialRepository,
  type ProviderMaterialStockStatus,
  type UserRecord,
  type UserRepository,
  type UserRoleRecord,
  type UserRoleRepository,
  type Uuidv7,
} from '@pim/domain'
import type { PublicProviderProfileDto } from './provider.js'

export type BuildVolumeDto = Readonly<{
  depthMm: number
  heightMm: number
  widthMm: number
}>

export type PrinterDto = Readonly<{
  buildVolumeMm: BuildVolumeDto
  id: Uuidv7
  modelCode: string
  providerProfileId: Uuidv7
  quantity: number
  status: PrinterStatus
  technologyCode: PrinterTechnologyCode
  version: number
}>

export type PrinterCapabilityDto = Readonly<{
  id: Uuidv7
  materialCode: PrinterMaterialCode
  printerId: Uuidv7
  qualityCode: PrinterQualityCode
  status: PrinterCapabilityStatus
  version: number
}>

export type ProviderMaterialDto = Readonly<{
  colorCode: PrinterColorCode
  id: Uuidv7
  materialCode: PrinterMaterialCode
  providerProfileId: Uuidv7
  quantityGrams: number
  stockStatus: ProviderMaterialStockStatus
  version: number
}>

export type PrinterWorkspaceDto = Readonly<{
  capabilities: readonly PrinterCapabilityDto[]
  materials: readonly ProviderMaterialDto[]
  printers: readonly PrinterDto[]
  profile: PublicProviderProfileDto
}>

export type PrinterValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export class PrinterNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'PrinterNotFoundError'
  }
}

export type CreatePrinterCommand = Readonly<{
  actorUserId: Uuidv7
  buildVolumeMm: BuildVolumeDto
  modelCode: string
  providerProfileId: Uuidv7
  quantity: number
  status?: PrinterStatus
  technologyCode: PrinterTechnologyCode
}>

export type UpdatePrinterCommand = Readonly<{
  actorUserId: Uuidv7
  buildVolumeMm: BuildVolumeDto
  expectedVersion: number
  modelCode: string
  printerId: Uuidv7
  quantity: number
  status?: PrinterStatus
  technologyCode: PrinterTechnologyCode
}>

export type CreatePrinterCapabilityCommand = Readonly<{
  actorUserId: Uuidv7
  materialCode: PrinterMaterialCode
  printerId: Uuidv7
  qualityCode: PrinterQualityCode
  status?: PrinterCapabilityStatus
}>

export type UpdatePrinterCapabilityCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  materialCode: PrinterMaterialCode
  qualityCode: PrinterQualityCode
  capabilityId: Uuidv7
  status?: PrinterCapabilityStatus
}>

export type CreateProviderMaterialCommand = Readonly<{
  actorUserId: Uuidv7
  colorCode: PrinterColorCode
  materialCode: PrinterMaterialCode
  providerProfileId: Uuidv7
  quantityGrams: number
  stockStatus?: ProviderMaterialStockStatus
}>

export type UpdateProviderMaterialCommand = Readonly<{
  actorUserId: Uuidv7
  colorCode: PrinterColorCode
  expectedVersion: number
  materialCode: PrinterMaterialCode
  materialId: Uuidv7
  quantityGrams: number
  stockStatus?: ProviderMaterialStockStatus
}>

export type PrinterServiceManager = Readonly<{
  createPrinter(input: CreatePrinterCommand): Promise<PrinterDto>
  createPrinterCapability(input: CreatePrinterCapabilityCommand): Promise<PrinterCapabilityDto>
  createProviderMaterial(input: CreateProviderMaterialCommand): Promise<ProviderMaterialDto>
  getPrinterWorkspace(input: Readonly<{ actorUserId: Uuidv7; providerProfileId: Uuidv7 }>): Promise<PrinterWorkspaceDto>
  updatePrinter(input: UpdatePrinterCommand): Promise<PrinterDto>
  updatePrinterCapability(input: UpdatePrinterCapabilityCommand): Promise<PrinterCapabilityDto>
  updateProviderMaterial(input: UpdateProviderMaterialCommand): Promise<ProviderMaterialDto>
}>

type Dependencies = Readonly<{
  capabilities: PrinterCapabilityRepository
  printers: PrinterRepository
  providerMaterials: ProviderMaterialRepository
  providerProfiles: {
    findById(id: Uuidv7): Promise<
      | Readonly<{
          id: Uuidv7
          ownerUserId: Uuidv7
          publicName: string
          serviceRegion: string | null
          status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED'
          version: number
        }>
      | null
    >
  }
  userRoles: UserRoleRepository
  users: UserRepository
  uuidGenerator: UuidGeneratorPort
}>

const printerRoleCodes = ['PRINT_PROVIDER', 'FULL_SERVICE_PROVIDER'] as const

function createValidationError(fields: readonly string[], message: string): PrinterValidationError {
  const error = new Error(message) as Error & {
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }

  Object.assign(error, {
    code: 'VALIDATION_ERROR' as const,
    fields,
    name: 'PrinterValidationError',
    status: 400 as const,
  })

  return error as PrinterValidationError
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeRequiredText(value: string, field: string): string {
  const sanitized = sanitizeText(value)
  if (!sanitized) {
    throw createValidationError([field], `${field} is required`)
  }
  return sanitized
}

function normalizePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw createValidationError([field], `${field} must be greater than zero`)
  }
  return value
}

function normalizePositiveNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw createValidationError([field], `${field} must be greater than zero`)
  }
  return value
}

function normalizeBuildVolume(buildVolumeMm: BuildVolumeDto): ReturnType<typeof parseDimensionsMm> {
  return parseDimensionsMm({
    depthMm: normalizePositiveNumber(buildVolumeMm.depthMm, 'buildVolumeMm.depthMm'),
    heightMm: normalizePositiveNumber(buildVolumeMm.heightMm, 'buildVolumeMm.heightMm'),
    widthMm: normalizePositiveNumber(buildVolumeMm.widthMm, 'buildVolumeMm.widthMm'),
  })
}

function toPrinterDto(record: PrinterRecord): PrinterDto {
  return Object.freeze({
    buildVolumeMm: Object.freeze({
      depthMm: record.buildVolumeMm.depthMm,
      heightMm: record.buildVolumeMm.heightMm,
      widthMm: record.buildVolumeMm.widthMm,
    }),
    id: record.id,
    modelCode: record.modelCode,
    providerProfileId: record.providerProfileId,
    quantity: record.quantity,
    status: record.status,
    technologyCode: record.technologyCode,
    version: record.version,
  })
}

function toPrinterCapabilityDto(record: PrinterCapabilityRecord): PrinterCapabilityDto {
  return Object.freeze({
    id: record.id,
    materialCode: record.materialCode,
    printerId: record.printerId,
    qualityCode: record.qualityCode,
    status: record.status,
    version: record.version,
  })
}

function toProviderMaterialDto(record: ProviderMaterialRecord): ProviderMaterialDto {
  return Object.freeze({
    colorCode: record.colorCode,
    id: record.id,
    materialCode: record.materialCode,
    providerProfileId: record.providerProfileId,
    quantityGrams: record.quantityGrams,
    stockStatus: record.stockStatus,
    version: record.version,
  })
}

function isPrinterRole(role: UserRoleRecord): boolean {
  return printerRoleCodes.includes(role.roleCode as (typeof printerRoleCodes)[number])
}

async function loadUserOrThrow(users: UserRepository, userId: Uuidv7): Promise<UserRecord> {
  const user = await users.findById(userId)
  if (!user) {
    throw new PrinterNotFoundError(`User ${userId} was not found`)
  }
  if (user.status !== 'ACTIVE') {
    throw new AuthorizationDeniedError()
  }
  return user
}

async function loadProfileOrThrow(
  providerProfiles: Dependencies['providerProfiles'],
  providerProfileId: Uuidv7,
): Promise<NonNullable<Awaited<ReturnType<Dependencies['providerProfiles']['findById']>>>> {
  const profile = await providerProfiles.findById(providerProfileId)
  if (!profile) {
    throw new PrinterNotFoundError(`ProviderProfile ${providerProfileId} was not found`)
  }
  return profile
}

async function loadPrinterOrThrow(
  printers: PrinterRepository,
  printerId: Uuidv7,
): Promise<PrinterRecord> {
  const printer = await printers.findById(printerId)
  if (!printer) {
    throw new PrinterNotFoundError(`Printer ${printerId} was not found`)
  }
  return printer
}

async function loadCapabilitiesForProfile(
  capabilities: PrinterCapabilityRepository,
  printers: PrinterRepository,
  providerProfileId: Uuidv7,
): Promise<readonly PrinterCapabilityDto[]> {
  const printerPage = await printers.list({
    filter: { providerProfileId, status: 'ACTIVE' },
    limit: 100,
    sort: { direction: 'asc', field: 'createdAt' },
  })

  const printerIds = new Set(printerPage.items.map((printer) => printer.id))
  const capabilityPage = await capabilities.list({
    filter: { status: 'ACTIVE' },
    limit: 100,
    sort: { direction: 'asc', field: 'createdAt' },
  })

  return capabilityPage.items
    .filter((capability) => printerIds.has(capability.printerId))
    .map((capability) => toPrinterCapabilityDto(capability))
}

async function loadPrinterRoles(
  userRoles: UserRoleRepository,
  userId: Uuidv7,
): Promise<readonly UserRoleRecord[]> {
  const roles = await userRoles.listByUserId(userId)
  return roles.filter((role) => role.status === 'ACTIVE' && isPrinterRole(role))
}

function canManagePrinter(roles: readonly UserRoleRecord[]): boolean {
  return roles.length > 0
}

function ensureProfileEditable(
  profile: { status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' },
  roles: readonly UserRoleRecord[],
): void {
  if (profile.status === 'SUSPENDED') {
    throw new AuthorizationDeniedError('คุณยังไม่สามารถจัดการทรัพยากรเครื่องพิมพ์นี้ได้')
  }

  if (!canManagePrinter(roles)) {
    throw new AuthorizationDeniedError('คุณยังไม่มีสิทธิ์จัดการเครื่องพิมพ์')
  }
}

function ensurePrintableTechnology(materialCode: PrinterMaterialCode, technologyCode: PrinterTechnologyCode): void {
  if (!isTechnologyMaterialCompatible(technologyCode, materialCode)) {
    throw createValidationError(['materialCode'], 'materialCode is not compatible with the selected technology')
  }
}

export function assertPrinterVersionConflict(error: unknown): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError
}

export function createPrinterServiceManager(input: Dependencies): PrinterServiceManager {
  return Object.freeze({
    async createPrinter(command): Promise<PrinterDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, command.providerProfileId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)
      ensureProfileEditable(profile, roles)

      const modelCode = normalizeRequiredText(command.modelCode, 'modelCode')
      const buildVolumeMm = normalizeBuildVolume(command.buildVolumeMm)
      const quantity = normalizePositiveInteger(command.quantity, 'quantity')
      const status = command.status ?? 'DRAFT'

      if (status === 'ACTIVE' && profile.status !== 'ACTIVE') {
        throw new AuthorizationDeniedError('คุณต้องเผยแพร่โปรไฟล์ก่อนเปิดใช้งานเครื่องพิมพ์')
      }

      const printer = await input.printers.create({
        buildVolumeMm,
        createdBy: user.id,
        id: input.uuidGenerator.next(),
        modelCode,
        providerProfileId: profile.id,
        quantity,
        status,
        technologyCode: command.technologyCode,
        updatedBy: user.id,
      })

      return toPrinterDto(printer)
    },

    async createPrinterCapability(command): Promise<PrinterCapabilityDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const printer = await loadPrinterOrThrow(input.printers, command.printerId)
      const profile = await loadProfileOrThrow(input.providerProfiles, printer.providerProfileId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)
      ensureProfileEditable(profile, roles)

      if (printer.providerProfileId !== profile.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการเครื่องพิมพ์นี้')
      }

      if (printer.status === 'DISABLED') {
        throw new AuthorizationDeniedError('เครื่องพิมพ์ที่ปิดใช้งานแล้วไม่สามารถเพิ่ม capability ได้')
      }

      ensurePrintableTechnology(command.materialCode, printer.technologyCode)

      const capability = await input.capabilities.create({
        createdBy: user.id,
        id: input.uuidGenerator.next(),
        materialCode: command.materialCode,
        printerId: printer.id,
        qualityCode: command.qualityCode,
        status: command.status ?? 'DRAFT',
        updatedBy: user.id,
      })

      return toPrinterCapabilityDto(capability)
    },

    async createProviderMaterial(command): Promise<ProviderMaterialDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, command.providerProfileId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)
      ensureProfileEditable(profile, roles)

      const colorCode = command.colorCode.trim().toUpperCase() as PrinterColorCode

      const material = await input.providerMaterials.create({
        colorCode,
        createdBy: user.id,
        id: input.uuidGenerator.next(),
        materialCode: command.materialCode,
        providerProfileId: profile.id,
        quantityGrams: normalizePositiveInteger(command.quantityGrams, 'quantityGrams'),
        stockStatus: command.stockStatus ?? 'IN_STOCK',
        updatedBy: user.id,
      })

      return toProviderMaterialDto(material)
    },

    async getPrinterWorkspace({ actorUserId, providerProfileId }): Promise<PrinterWorkspaceDto> {
      const user = await loadUserOrThrow(input.users, actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, providerProfileId)
      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์อ่าน workspace ของโปรไฟล์นี้')
      }

      const printerPage = await input.printers.list({
        filter: { providerProfileId },
        limit: 100,
        sort: { direction: 'asc', field: 'createdAt' },
      })

      const materialPage = await input.providerMaterials.list({
        filter: { providerProfileId },
        limit: 100,
        sort: { direction: 'asc', field: 'createdAt' },
      })

      const capabilities = await loadCapabilitiesForProfile(input.capabilities, input.printers, providerProfileId)

      return Object.freeze({
        capabilities,
        materials: materialPage.items.map((material) => toProviderMaterialDto(material)),
        printers: printerPage.items.map((printer) => toPrinterDto(printer)),
        profile: {
          id: profile.id,
          publicName: profile.publicName,
          serviceRegion: profile.serviceRegion,
          status: profile.status,
          version: profile.version,
        },
      })
    },

    async updatePrinter(command): Promise<PrinterDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const current = await loadPrinterOrThrow(input.printers, command.printerId)
      const profile = await loadProfileOrThrow(input.providerProfiles, current.providerProfileId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)
      ensureProfileEditable(profile, roles)

      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการเครื่องพิมพ์นี้')
      }

      const nextStatus = command.status ?? current.status
      if (nextStatus === 'ACTIVE' && profile.status !== 'ACTIVE') {
        throw new AuthorizationDeniedError('คุณต้องเผยแพร่โปรไฟล์ก่อนเปิดใช้งานเครื่องพิมพ์')
      }

      const updated = await input.printers.update(
        Object.freeze({
          ...current,
          buildVolumeMm: normalizeBuildVolume(command.buildVolumeMm),
          modelCode: normalizeRequiredText(command.modelCode, 'modelCode'),
          quantity: normalizePositiveInteger(command.quantity, 'quantity'),
          status: nextStatus,
          technologyCode: command.technologyCode,
          updatedBy: user.id,
        }),
        command.expectedVersion,
      )

      return toPrinterDto(updated)
    },

    async updatePrinterCapability(command): Promise<PrinterCapabilityDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const current = await input.capabilities.findById(command.capabilityId)
      if (!current) {
        throw new PrinterNotFoundError(`PrinterCapability ${command.capabilityId} was not found`)
      }
      const roles = await loadPrinterRoles(input.userRoles, user.id)
      const printer = await loadPrinterOrThrow(input.printers, current.printerId)
      const profile = await loadProfileOrThrow(input.providerProfiles, printer.providerProfileId)
      ensureProfileEditable(profile, roles)

      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการ capability นี้')
      }

      ensurePrintableTechnology(command.materialCode, printer.technologyCode)

      const updated = await input.capabilities.update(
        Object.freeze({
          ...current,
          materialCode: command.materialCode,
          qualityCode: command.qualityCode,
          status: command.status ?? current.status,
          updatedBy: user.id,
        }),
        command.expectedVersion,
      )

      return toPrinterCapabilityDto(updated)
    },

    async updateProviderMaterial(command): Promise<ProviderMaterialDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const current = await input.providerMaterials.findById(command.materialId)
      if (!current) {
        throw new PrinterNotFoundError(`ProviderMaterial ${command.materialId} was not found`)
      }

      const profile = await loadProfileOrThrow(input.providerProfiles, current.providerProfileId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)
      ensureProfileEditable(profile, roles)

      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการวัสดุนี้')
      }

      const colorCode = command.colorCode.trim().toUpperCase() as PrinterColorCode

      const updated = await input.providerMaterials.update(
        Object.freeze({
          ...current,
          colorCode,
          materialCode: command.materialCode,
          quantityGrams: normalizePositiveInteger(command.quantityGrams, 'quantityGrams'),
          stockStatus: command.stockStatus ?? current.stockStatus,
          updatedBy: user.id,
        }),
        command.expectedVersion,
      )

      return toProviderMaterialDto(updated)
    },
  })
}
