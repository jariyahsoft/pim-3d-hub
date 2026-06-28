import {
  AuthorizationDeniedError,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'
import type { PublicProviderProfileDto } from './provider.js'
import {
  CapacityUnavailableError,
  RepositoryConflictError,
  type CapacityClosureRecord,
  type CapacityRepository,
  type CapacityReservationReleaseReason,
  type CapacityReservationRecord,
  type CapacitySlotRecord,
  type ProviderProfileRecord,
  type ProviderProfileRepository,
  type ProviderServiceRecord,
  type ProviderServiceRepository,
  type ProviderServiceType,
  type UserRecord,
  type UserRepository,
  type UserRoleRecord,
  type UserRoleRepository,
  type UtcTimestamp,
  type Uuidv7,
  type PrinterRecord,
  type PrinterRepository,
} from '@pim/domain'

export type CapacitySlotDto = Readonly<{
  endsAt: UtcTimestamp
  id: Uuidv7
  printerId: Uuidv7
  providerProfileId: Uuidv7
  reservedUnits: number
  startsAt: UtcTimestamp
  status: 'OPEN' | 'PAUSED' | 'CLOSED'
  totalUnits: number
  version: number
}>

export type CapacityClosureDto = Readonly<{
  endsAt: UtcTimestamp
  id: Uuidv7
  printerId: Uuidv7
  providerProfileId: Uuidv7
  reason: string | null
  releasedAt: UtcTimestamp | null
  slotId: Uuidv7
  startsAt: UtcTimestamp
  status: 'ACTIVE' | 'RELEASED'
  version: number
}>

export type CapacityReservationDto = Readonly<{
  expiresAt: UtcTimestamp
  id: Uuidv7
  printerId: Uuidv7
  providerProfileId: Uuidv7
  providerServiceId: Uuidv7
  releaseReason: CapacityReservationReleaseReason | null
  releasedAt: UtcTimestamp | null
  slotId: Uuidv7
  status: 'ACTIVE' | 'RELEASED' | 'EXPIRED'
  units: number
  version: number
}>

export type CapacityWorkspaceDto = Readonly<{
  closures: readonly CapacityClosureDto[]
  profile: PublicProviderProfileDto
  reservations: readonly CapacityReservationDto[]
  slots: readonly CapacitySlotDto[]
}>

export type CapacityValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export class CapacityNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'CapacityNotFoundError'
  }
}

export type CreateCapacitySlotCommand = Readonly<{
  actorUserId: Uuidv7
  endsAt: UtcTimestamp
  printerId: Uuidv7
  providerProfileId: Uuidv7
  startsAt: UtcTimestamp
  status?: 'OPEN' | 'PAUSED'
  totalUnits: number
}>

export type UpdateCapacitySlotCommand = Readonly<{
  actorUserId: Uuidv7
  endsAt?: UtcTimestamp
  expectedVersion: number
  slotId: Uuidv7
  status?: 'OPEN' | 'PAUSED'
  totalUnits?: number
}>

export type CloseCapacitySlotCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  reason?: string | null
  slotId: Uuidv7
}>

export type ReopenCapacitySlotCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  slotId: Uuidv7
}>

export type ReserveCapacityCommand = Readonly<{
  actorUserId: Uuidv7
  expiresAt: UtcTimestamp
  idempotencyKey: string
  providerServiceId: Uuidv7
  slotId: Uuidv7
  units: number
}>

export type ReleaseCapacityReservationCommand = Readonly<{
  actorUserId: Uuidv7
  reason?: Extract<CapacityReservationReleaseReason, 'MANUAL' | 'CANCELLED'>
  reservationId: Uuidv7
}>

export type CapacityExpiryWorkerResult = Readonly<{
  released: readonly CapacityReservationDto[]
  scanned: number
}>

export type CapacityService = Readonly<{
  closeCapacitySlot(input: CloseCapacitySlotCommand): Promise<CapacityWorkspaceSlotChangeDto>
  createCapacitySlot(input: CreateCapacitySlotCommand): Promise<CapacitySlotDto>
  getCapacityWorkspace(input: Readonly<{
    actorUserId: Uuidv7
    providerProfileId: Uuidv7
  }>): Promise<CapacityWorkspaceDto>
  releaseCapacityReservation(
    input: ReleaseCapacityReservationCommand,
  ): Promise<CapacityReservationDto>
  releaseExpiredReservations(input?: Readonly<{
    asOf?: UtcTimestamp
    limit?: number
  }>): Promise<CapacityExpiryWorkerResult>
  reopenCapacitySlot(input: ReopenCapacitySlotCommand): Promise<CapacityWorkspaceSlotChangeDto>
  reserveCapacity(input: ReserveCapacityCommand): Promise<CapacityReservationDto>
  updateCapacitySlot(input: UpdateCapacitySlotCommand): Promise<CapacitySlotDto>
}>

export type CapacityWorkspaceSlotChangeDto = Readonly<{
  closure: CapacityClosureDto
  slot: CapacitySlotDto
}>

type Dependencies = Readonly<{
  capacityRepository: CapacityRepository
  clock: ClockPort
  printers: PrinterRepository
  providerProfiles: ProviderProfileRepository
  providerServices: ProviderServiceRepository
  userRoles: UserRoleRepository
  users: UserRepository
  uuidGenerator: UuidGeneratorPort
}>

const printerRoleCodes = ['PRINT_PROVIDER', 'FULL_SERVICE_PROVIDER'] as const

function createValidationError(fields: readonly string[], message: string): CapacityValidationError {
  const error = new Error(message) as Error & {
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }

  Object.assign(error, {
    code: 'VALIDATION_ERROR' as const,
    fields,
    name: 'CapacityValidationError',
    status: 400 as const,
  })

  return error as CapacityValidationError
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw createValidationError([field], `${field} must be greater than zero`)
  }

  return value
}

function normalizeOptionalReason(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const sanitized = sanitizeText(value)
  return sanitized.length > 0 ? sanitized : null
}

function assertTimeRange(startsAt: UtcTimestamp, endsAt: UtcTimestamp): void {
  if (Date.parse(startsAt) >= Date.parse(endsAt)) {
    throw createValidationError(['startsAt', 'endsAt'], 'startsAt must be before endsAt')
  }
}

function toPublicProfileDto(record: ProviderProfileRecord): PublicProviderProfileDto {
  return Object.freeze({
    id: record.id,
    publicName: record.publicName,
    serviceRegion: record.serviceRegion,
    status: record.status,
    version: record.version,
  })
}

function toCapacitySlotDto(record: CapacitySlotRecord): CapacitySlotDto {
  return Object.freeze({
    endsAt: record.endsAt,
    id: record.id,
    printerId: record.printerId,
    providerProfileId: record.providerProfileId,
    reservedUnits: record.reservedUnits,
    startsAt: record.startsAt,
    status: record.status,
    totalUnits: record.totalUnits,
    version: record.version,
  })
}

function toCapacityClosureDto(record: CapacityClosureRecord): CapacityClosureDto {
  return Object.freeze({
    endsAt: record.endsAt,
    id: record.id,
    printerId: record.printerId,
    providerProfileId: record.providerProfileId,
    reason: record.reason,
    releasedAt: record.releasedAt,
    slotId: record.slotId,
    startsAt: record.startsAt,
    status: record.status,
    version: record.version,
  })
}

function toCapacityReservationDto(record: CapacityReservationRecord): CapacityReservationDto {
  return Object.freeze({
    expiresAt: record.expiresAt,
    id: record.id,
    printerId: record.printerId,
    providerProfileId: record.providerProfileId,
    providerServiceId: record.providerServiceId,
    releaseReason: record.releaseReason,
    releasedAt: record.releasedAt,
    slotId: record.slotId,
    status: record.status,
    units: record.units,
    version: record.version,
  })
}

function isPrinterRole(role: UserRoleRecord): boolean {
  return printerRoleCodes.includes(role.roleCode as (typeof printerRoleCodes)[number])
}

function isPrintableServiceType(serviceType: ProviderServiceType): boolean {
  return serviceType === 'PRINT_ONLY' || serviceType === 'DESIGN_AND_PRINT'
}

async function loadUserOrThrow(users: UserRepository, userId: Uuidv7): Promise<UserRecord> {
  const user = await users.findById(userId)

  if (!user) {
    throw new CapacityNotFoundError(`User ${userId} was not found`)
  }

  if (user.status !== 'ACTIVE') {
    throw new AuthorizationDeniedError()
  }

  return user
}

async function loadProfileOrThrow(
  providerProfiles: ProviderProfileRepository,
  profileId: Uuidv7,
): Promise<ProviderProfileRecord> {
  const profile = await providerProfiles.findById(profileId)

  if (!profile) {
    throw new CapacityNotFoundError(`ProviderProfile ${profileId} was not found`)
  }

  return profile
}

async function loadPrinterOrThrow(
  printers: PrinterRepository,
  printerId: Uuidv7,
): Promise<PrinterRecord> {
  const printer = await printers.findById(printerId)

  if (!printer) {
    throw new CapacityNotFoundError(`Printer ${printerId} was not found`)
  }

  return printer
}

async function loadServiceOrThrow(
  providerServices: ProviderServiceRepository,
  providerServiceId: Uuidv7,
): Promise<ProviderServiceRecord> {
  const service = await providerServices.findById(providerServiceId)

  if (!service) {
    throw new CapacityNotFoundError(`ProviderService ${providerServiceId} was not found`)
  }

  return service
}

async function loadSlotOrThrow(
  capacityRepository: CapacityRepository,
  slotId: Uuidv7,
): Promise<CapacitySlotRecord> {
  const slot = await capacityRepository.findSlotById(slotId)

  if (!slot) {
    throw new CapacityNotFoundError(`CapacitySlot ${slotId} was not found`)
  }

  return slot
}

async function loadReservationOrThrow(
  capacityRepository: CapacityRepository,
  reservationId: Uuidv7,
): Promise<CapacityReservationRecord> {
  const reservation = await capacityRepository.findReservationById(reservationId)

  if (!reservation) {
    throw new CapacityNotFoundError(`CapacityReservation ${reservationId} was not found`)
  }

  return reservation
}

async function loadPrinterRoles(
  userRoles: UserRoleRepository,
  userId: Uuidv7,
): Promise<readonly UserRoleRecord[]> {
  const roles = await userRoles.listByUserId(userId)
  return roles.filter((role) => role.status === 'ACTIVE' && isPrinterRole(role))
}

function ensureProviderOwner(user: UserRecord, profile: ProviderProfileRecord): void {
  if (profile.ownerUserId !== user.id) {
    throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการกำลังการผลิตของโปรไฟล์นี้')
  }
}

function ensureCapacityManager(
  profile: ProviderProfileRecord,
  printer: PrinterRecord,
  roles: readonly UserRoleRecord[],
): void {
  if (roles.length === 0) {
    throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการกำลังการผลิต')
  }

  if (profile.status === 'SUSPENDED') {
    throw new AuthorizationDeniedError('โปรไฟล์นี้ถูกระงับและไม่สามารถจัดการกำลังการผลิตได้')
  }

  if (printer.status === 'DISABLED') {
    throw new AuthorizationDeniedError('เครื่องพิมพ์ที่ปิดใช้งานแล้วไม่สามารถจัดการกำลังการผลิตได้')
  }
}

function ensureReservationAllowed(
  profile: ProviderProfileRecord,
  printer: PrinterRecord,
  service: ProviderServiceRecord,
): void {
  if (profile.status !== 'ACTIVE') {
    throw new CapacityUnavailableError('provider profile is not active', ['providerProfileId'])
  }

  if (printer.status !== 'ACTIVE') {
    throw new CapacityUnavailableError('printer is not active', ['printerId'])
  }

  if (service.status !== 'ACTIVE' || !isPrintableServiceType(service.serviceType)) {
    throw new CapacityUnavailableError('provider service is not active for reservations', ['providerServiceId'])
  }
}

function createReservationRequestHash(input: Readonly<{
  expiresAt: UtcTimestamp
  providerServiceId: Uuidv7
  slotId: Uuidv7
  units: number
}>): string {
  return JSON.stringify({
    expiresAt: input.expiresAt,
    providerServiceId: input.providerServiceId,
    slotId: input.slotId,
    units: input.units,
  })
}

export function assertCapacityVersionConflict(error: unknown): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError
}

export function createCapacityService(input: Dependencies): CapacityService {
  return Object.freeze({
    async closeCapacitySlot(command): Promise<CapacityWorkspaceSlotChangeDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const slot = await loadSlotOrThrow(input.capacityRepository, command.slotId)
      const profile = await loadProfileOrThrow(input.providerProfiles, slot.providerProfileId)
      const printer = await loadPrinterOrThrow(input.printers, slot.printerId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)

      ensureProviderOwner(user, profile)
      ensureCapacityManager(profile, printer, roles)

      const result = await input.capacityRepository.closeSlot({
        actorUserId: user.id,
        reason: normalizeOptionalReason(command.reason) ?? null,
        slotExpectedVersion: command.expectedVersion,
        slotId: slot.id,
      })

      return Object.freeze({
        closure: toCapacityClosureDto(result.closure),
        slot: toCapacitySlotDto(result.slot),
      })
    },

    async createCapacitySlot(command): Promise<CapacitySlotDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, command.providerProfileId)
      const printer = await loadPrinterOrThrow(input.printers, command.printerId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)

      ensureProviderOwner(user, profile)
      ensureCapacityManager(profile, printer, roles)
      assertTimeRange(command.startsAt, command.endsAt)

      const totalUnits = normalizePositiveInteger(command.totalUnits, 'totalUnits')
      const status = command.status ?? 'OPEN'
      if (status === 'OPEN' && (profile.status !== 'ACTIVE' || printer.status !== 'ACTIVE')) {
        throw new AuthorizationDeniedError('โปรไฟล์และเครื่องพิมพ์ต้องพร้อมใช้งานก่อนเปิด slot')
      }

      const slot = await input.capacityRepository.createSlot({
        createdBy: user.id,
        endsAt: command.endsAt,
        id: input.uuidGenerator.next(),
        printerId: printer.id,
        providerProfileId: profile.id,
        startsAt: command.startsAt,
        status,
        totalUnits,
        updatedBy: user.id,
      })

      return toCapacitySlotDto(slot)
    },

    async getCapacityWorkspace(command): Promise<CapacityWorkspaceDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, command.providerProfileId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)

      ensureProviderOwner(user, profile)
      if (roles.length === 0) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์ดูข้อมูลกำลังการผลิต')
      }

      const [slots, closures, reservations] = await Promise.all([
        input.capacityRepository.listSlots({
          filter: {
            providerProfileId: profile.id,
          },
          limit: 100,
          sort: { direction: 'asc', field: 'startsAt' },
        }),
        input.capacityRepository.listClosures({
          filter: {
            providerProfileId: profile.id,
          },
          limit: 100,
          sort: { direction: 'desc', field: 'startsAt' },
        }),
        input.capacityRepository.listReservations({
          filter: {
            providerProfileId: profile.id,
          },
          limit: 100,
          sort: { direction: 'asc', field: 'expiresAt' },
        }),
      ])

      return Object.freeze({
        closures: closures.items.map((item) => toCapacityClosureDto(item)),
        profile: toPublicProfileDto(profile),
        reservations: reservations.items.map((item) => toCapacityReservationDto(item)),
        slots: slots.items.map((item) => toCapacitySlotDto(item)),
      })
    },

    async releaseCapacityReservation(command): Promise<CapacityReservationDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const reservation = await loadReservationOrThrow(input.capacityRepository, command.reservationId)
      const slot = await loadSlotOrThrow(input.capacityRepository, reservation.slotId)
      const profile = await loadProfileOrThrow(input.providerProfiles, slot.providerProfileId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)

      ensureProviderOwner(user, profile)
      if (roles.length === 0) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์ปล่อยกำลังการผลิต')
      }

      const released = await input.capacityRepository.releaseReservation({
        actorUserId: user.id,
        reason: command.reason ?? 'MANUAL',
        reservationId: reservation.id,
      })

      return toCapacityReservationDto(released)
    },

    async releaseExpiredReservations(command): Promise<CapacityExpiryWorkerResult> {
      const asOf = command?.asOf ?? input.clock.now()
      const page = await input.capacityRepository.listReservations({
        filter: {
          expiresAtLte: asOf,
          status: 'ACTIVE',
        },
        limit: command?.limit ?? 100,
        sort: { direction: 'asc', field: 'expiresAt' },
      })

      const released: CapacityReservationDto[] = []
      for (const reservation of page.items) {
        const next = await input.capacityRepository.releaseReservation({
          actorUserId: null,
          reason: 'EXPIRED',
          reservationId: reservation.id,
        })
        released.push(toCapacityReservationDto(next))
      }

      return Object.freeze({
        released,
        scanned: page.items.length,
      })
    },

    async reopenCapacitySlot(command): Promise<CapacityWorkspaceSlotChangeDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const slot = await loadSlotOrThrow(input.capacityRepository, command.slotId)
      const profile = await loadProfileOrThrow(input.providerProfiles, slot.providerProfileId)
      const printer = await loadPrinterOrThrow(input.printers, slot.printerId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)

      ensureProviderOwner(user, profile)
      ensureCapacityManager(profile, printer, roles)

      const result = await input.capacityRepository.reopenSlot({
        actorUserId: user.id,
        slotExpectedVersion: command.expectedVersion,
        slotId: slot.id,
      })

      return Object.freeze({
        closure: toCapacityClosureDto(result.closure),
        slot: toCapacitySlotDto(result.slot),
      })
    },

    async reserveCapacity(command): Promise<CapacityReservationDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const slot = await loadSlotOrThrow(input.capacityRepository, command.slotId)
      const profile = await loadProfileOrThrow(input.providerProfiles, slot.providerProfileId)
      const printer = await loadPrinterOrThrow(input.printers, slot.printerId)
      const service = await loadServiceOrThrow(input.providerServices, command.providerServiceId)

      if (service.providerProfileId !== slot.providerProfileId) {
        throw new CapacityUnavailableError('service does not belong to the requested provider profile', [
          'providerServiceId',
          'slotId',
        ])
      }

      ensureReservationAllowed(profile, printer, service)

      const expiresAt = command.expiresAt
      if (Date.parse(expiresAt) <= Date.parse(input.clock.now())) {
        throw createValidationError(['expiresAt'], 'expiresAt must be in the future')
      }

      const units = normalizePositiveInteger(command.units, 'units')
      const reservation = await input.capacityRepository.reserve({
        createdBy: user.id,
        expiresAt,
        id: input.uuidGenerator.next(),
        idempotencyKey: sanitizeText(command.idempotencyKey),
        printerId: slot.printerId,
        providerProfileId: slot.providerProfileId,
        providerServiceId: service.id,
        requestHash: createReservationRequestHash({
          expiresAt,
          providerServiceId: service.id,
          slotId: slot.id,
          units,
        }),
        reservedByUserId: user.id,
        slotId: slot.id,
        units,
        updatedBy: user.id,
      })

      return toCapacityReservationDto(reservation)
    },

    async updateCapacitySlot(command): Promise<CapacitySlotDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const currentSlot = await loadSlotOrThrow(input.capacityRepository, command.slotId)
      const profile = await loadProfileOrThrow(input.providerProfiles, currentSlot.providerProfileId)
      const printer = await loadPrinterOrThrow(input.printers, currentSlot.printerId)
      const roles = await loadPrinterRoles(input.userRoles, user.id)

      ensureProviderOwner(user, profile)
      ensureCapacityManager(profile, printer, roles)

      const nextTotalUnits = command.totalUnits === undefined
        ? currentSlot.totalUnits
        : normalizePositiveInteger(command.totalUnits, 'totalUnits')
      if (nextTotalUnits < currentSlot.reservedUnits) {
        throw new CapacityUnavailableError('cannot reduce totalUnits below reservedUnits', ['totalUnits'])
      }

      const nextStatus = command.status ?? currentSlot.status
      if (nextStatus === 'CLOSED') {
        throw createValidationError(['status'], 'use closeCapacitySlot to close a slot')
      }

      const nextEndsAt = command.endsAt ?? currentSlot.endsAt
      assertTimeRange(currentSlot.startsAt, nextEndsAt)

      const updated = await input.capacityRepository.updateSlot(
        Object.freeze({
          ...currentSlot,
          endsAt: nextEndsAt,
          status: nextStatus,
          totalUnits: nextTotalUnits,
          updatedBy: user.id,
        }),
        command.expectedVersion,
      )

      return toCapacitySlotDto(updated)
    },
  })
}
