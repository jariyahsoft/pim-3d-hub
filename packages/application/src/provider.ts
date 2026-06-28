import {
  AuthorizationDeniedError,
  type UuidGeneratorPort,
} from './identity.js'
import {
  RepositoryConflictError,
  type CapacityRepository,
  type PrinterCapabilityRepository,
  type PrinterRepository,
  type ProviderProfileRecord,
  type ProviderProfileRepository,
  type ProviderProfileStatus,
  type ProviderCompletedJobFact,
  type ProviderServiceRecord,
  type ProviderServiceRepository,
  type ProviderServiceStatus,
  type ProviderServiceType,
  type ProviderTrustProjectionRecord,
  type ProviderTrustProjectionRepository,
  type ProviderMaterialRepository,
  type UserRecord,
  type UserRepository,
  type UserRoleRecord,
  type UserRoleRepository,
  type Uuidv7,
  type VerificationCaseRepository,
} from '@pim/domain'

export type PublicProviderProfileDto = Readonly<{
  id: Uuidv7
  publicName: string
  serviceRegion: string | null
  status: ProviderProfileStatus
  version: number
}>

export type ProviderServiceDto = Readonly<{
  id: Uuidv7
  instantOrderEnabled: boolean
  leadTimeDays: number
  providerProfileId: Uuidv7
  serviceDescription: string
  serviceName: string
  serviceRegion: string | null
  serviceType: ProviderServiceType
  status: ProviderServiceStatus
  version: number
}>

export type ProviderWorkspaceDto = Readonly<{
  profile: PublicProviderProfileDto
  services: readonly ProviderServiceDto[]
}>

export type ProviderOnboardingStepCode =
  | 'PROFILE'
  | 'SERVICES'
  | 'VERIFICATION'
  | 'PRINTER_SETUP'
  | 'MATERIAL_STOCK'
  | 'CAPACITY'

export type ProviderOnboardingStepDto = Readonly<{
  code: ProviderOnboardingStepCode
  detail: string
  label: string
  required: boolean
  status: 'COMPLETE' | 'ACTION_REQUIRED' | 'OPTIONAL'
}>

export type ProviderOnboardingOverviewDto = Readonly<{
  approvedBadge: boolean
  canPublishDesignOnly: boolean
  canPublishInstantPrint: boolean
  profile: PublicProviderProfileDto
  services: readonly ProviderServiceDto[]
  steps: readonly ProviderOnboardingStepDto[]
}>

export type ProviderTrustProjectionDto = Readonly<{
  completedJobsCount: number
  lowSampleSize: boolean
  onTimeRatePercent: number | null
  ratingAverage: number | null
  ratingCount: number
  sponsored: boolean
}>

export type PublicProviderCardDto = Readonly<{
  approvedBadge: boolean
  id: Uuidv7
  leadTimeDaysMin: number | null
  lowSampleSize: boolean
  onTimeRatePercent: number | null
  portfolioPlaceholders: readonly string[]
  publicName: string
  ratingAverage: number | null
  ratingCount: number
  serviceRegion: string | null
  serviceTypes: readonly ProviderServiceType[]
  sponsored: boolean
  status: ProviderProfileStatus
}>

export type ProviderValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export class ProviderNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'ProviderNotFoundError'
  }
}

export type CreateProviderProfileCommand = Readonly<{
  actorUserId: Uuidv7
  publicName: string
  serviceRegion?: string | null | undefined
  status?: ProviderProfileStatus | undefined
}>

export type UpdateProviderProfileCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  profileId: Uuidv7
  publicName?: string | null | undefined
  serviceRegion?: string | null | undefined
  status?: ProviderProfileStatus | undefined
}>

export type CreateProviderServiceCommand = Readonly<{
  actorUserId: Uuidv7
  instantOrderEnabled?: boolean | undefined
  leadTimeDays: number
  providerProfileId: Uuidv7
  serviceDescription: string
  serviceName: string
  serviceRegion?: string | null | undefined
  serviceType: ProviderServiceType
  status?: ProviderServiceStatus | undefined
}>

export type UpdateProviderServiceCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  instantOrderEnabled?: boolean | undefined
  leadTimeDays?: number | undefined
  serviceDescription?: string | null | undefined
  serviceId: Uuidv7
  serviceName?: string | null | undefined
  serviceRegion?: string | null | undefined
  status?: ProviderServiceStatus | undefined
}>

export type RebuildProviderTrustProjectionCommand = Readonly<{
  actorUserId?: Uuidv7 | null | undefined
  completedJobs: readonly ProviderCompletedJobFact[]
  providerProfileId: Uuidv7
  sponsored?: boolean | undefined
}>

export type ProviderServiceManager = Readonly<{
  createProviderProfile(input: CreateProviderProfileCommand): Promise<PublicProviderProfileDto>
  createProviderService(input: CreateProviderServiceCommand): Promise<ProviderServiceDto>
  getProviderOnboardingOverview(
    input: Readonly<{ actorUserId: Uuidv7; profileId: Uuidv7 }>,
  ): Promise<ProviderOnboardingOverviewDto>
  getProviderProfile(input: Readonly<{ actorUserId: Uuidv7; profileId: Uuidv7 }>): Promise<PublicProviderProfileDto>
  getPublicProviderCard(input: Readonly<{ profileId: Uuidv7 }>): Promise<PublicProviderCardDto>
  getProviderWorkspace(input: Readonly<{ actorUserId: Uuidv7; profileId: Uuidv7 }>): Promise<ProviderWorkspaceDto>
  rebuildProviderTrustProjection(
    input: RebuildProviderTrustProjectionCommand,
  ): Promise<ProviderTrustProjectionDto>
  updateProviderProfile(input: UpdateProviderProfileCommand): Promise<PublicProviderProfileDto>
  updateProviderService(input: UpdateProviderServiceCommand): Promise<ProviderServiceDto>
}>

type Dependencies = Readonly<{
  capacities: CapacityRepository
  capabilities: PrinterCapabilityRepository
  printers: PrinterRepository
  providerProfiles: ProviderProfileRepository
  providerMaterials: ProviderMaterialRepository
  providerServices: ProviderServiceRepository
  providerTrustProjections: ProviderTrustProjectionRepository
  userRoles: UserRoleRepository
  users: UserRepository
  verificationCases: VerificationCaseRepository
  uuidGenerator: UuidGeneratorPort
}>

const providerRoleCodes = ['DESIGN_PROVIDER', 'PRINT_PROVIDER', 'FULL_SERVICE_PROVIDER'] as const
const lowSampleSizeThreshold = 5
const publicPortfolioPlaceholders = Object.freeze([
  'Portfolio preview coming soon',
  'Finished print showcase coming soon',
  'Design-to-print case study coming soon',
])

function createValidationError(fields: readonly string[], message: string): ProviderValidationError {
  const error = new Error(message) as Error & {
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }

  Object.assign(error, {
    code: 'VALIDATION_ERROR' as const,
    fields,
    name: 'ProviderValidationError',
    status: 400 as const,
  })

  return error as ProviderValidationError
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const sanitized = sanitizeText(value)
  return sanitized.length > 0 ? sanitized : null
}

function normalizeRequiredText(value: string, field: string): string {
  const sanitized = sanitizeText(value)

  if (!sanitized) {
    throw createValidationError([field], `${field} is required`)
  }

  return sanitized
}

function normalizeLeadTimeDays(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw createValidationError(['leadTimeDays'], 'leadTimeDays must be greater than zero')
  }

  return value
}

function toPublicProviderProfileDto(record: ProviderProfileRecord): PublicProviderProfileDto {
  return Object.freeze({
    id: record.id,
    publicName: record.publicName,
    serviceRegion: record.serviceRegion,
    status: record.status,
    version: record.version,
  })
}

function toProviderServiceDto(record: ProviderServiceRecord): ProviderServiceDto {
  return Object.freeze({
    id: record.id,
    instantOrderEnabled: record.instantOrderEnabled,
    leadTimeDays: record.leadTimeDays,
    providerProfileId: record.providerProfileId,
    serviceDescription: record.serviceDescription,
    serviceName: record.serviceName,
    serviceRegion: record.serviceRegion,
    serviceType: record.serviceType,
    status: record.status,
    version: record.version,
  })
}

function isProviderRole(role: UserRoleRecord): boolean {
  return providerRoleCodes.includes(role.roleCode as (typeof providerRoleCodes)[number])
}

async function loadUserOrThrow(users: UserRepository, userId: Uuidv7): Promise<UserRecord> {
  const user = await users.findById(userId)

  if (!user) {
    throw new ProviderNotFoundError(`User ${userId} was not found`)
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
    throw new ProviderNotFoundError(`ProviderProfile ${profileId} was not found`)
  }

  return profile
}

async function loadServiceOrThrow(
  providerServices: ProviderServiceRepository,
  serviceId: Uuidv7,
): Promise<ProviderServiceRecord> {
  const service = await providerServices.findById(serviceId)

  if (!service) {
    throw new ProviderNotFoundError(`ProviderService ${serviceId} was not found`)
  }

  return service
}

async function loadActorRoles(
  userRoles: UserRoleRepository,
  userId: Uuidv7,
): Promise<readonly UserRoleRecord[]> {
  const roles = await userRoles.listByUserId(userId)
  return roles.filter((role) => role.status === 'ACTIVE' && isProviderRole(role))
}

function hasDesignRole(roles: readonly UserRoleRecord[]): boolean {
  return roles.some((role) => role.roleCode === 'DESIGN_PROVIDER' || role.roleCode === 'FULL_SERVICE_PROVIDER')
}

function hasPrintRole(roles: readonly UserRoleRecord[]): boolean {
  return roles.some((role) => role.roleCode === 'PRINT_PROVIDER' || role.roleCode === 'FULL_SERVICE_PROVIDER')
}

function isPrintCapableServiceType(serviceType: ProviderServiceType): boolean {
  return serviceType === 'PRINT_ONLY' || serviceType === 'DESIGN_AND_PRINT'
}

function isProfileComplete(
  profile: Readonly<{
    publicName: string
    serviceRegion: string | null
  }>,
): boolean {
  return hasMeaningfulText(profile.publicName) && hasMeaningfulText(profile.serviceRegion)
}

function toProviderTrustProjectionDto(
  projection: ProviderTrustProjectionRecord | null,
): ProviderTrustProjectionDto {
  if (!projection) {
    return Object.freeze({
      completedJobsCount: 0,
      lowSampleSize: true,
      onTimeRatePercent: null,
      ratingAverage: null,
      ratingCount: 0,
      sponsored: false,
    })
  }

  return Object.freeze({
    completedJobsCount: projection.completedJobsCount,
    lowSampleSize: projection.lowSampleSize,
    onTimeRatePercent:
      projection.completedJobsCount > 0
        ? Math.round((projection.onTimeJobsCount / projection.completedJobsCount) * 100)
        : null,
    ratingAverage:
      projection.ratingAverage === null
        ? null
        : Math.round(projection.ratingAverage * 10) / 10,
    ratingCount: projection.ratingCount,
    sponsored: projection.sponsored,
  })
}

async function hasApprovedVerificationBadge(
  verificationCases: VerificationCaseRepository,
  ownerUserId: Uuidv7,
): Promise<boolean> {
  const cases = await verificationCases.listBySubject('USER', ownerUserId)
  return cases.some((entry) => entry.status === 'APPROVED')
}

async function loadPrintReadiness(
  input: Pick<
    Dependencies,
    'capacities' | 'capabilities' | 'printers' | 'providerMaterials'
  >,
  providerProfileId: Uuidv7,
): Promise<Readonly<{
  hasActivePrinter: boolean
  hasCapacityConfigured: boolean
  hasCompatibleCapabilityMaterial: boolean
  hasStockedMaterial: boolean
}>> {
  const printers = await input.printers.list({
    filter: {
      providerProfileId,
      status: 'ACTIVE',
    },
    limit: 100,
    sort: {
      direction: 'asc',
      field: 'createdAt',
    },
  })
  const materials = await input.providerMaterials.list({
    filter: {
      providerProfileId,
    },
    limit: 100,
    sort: {
      direction: 'asc',
      field: 'createdAt',
    },
  })
  const capacitySlots = await input.capacities.listSlots({
    filter: {
      providerProfileId,
    },
    limit: 1,
    sort: {
      direction: 'asc',
      field: 'startsAt',
    },
  })

  const stockedMaterialCodes = new Set(
    materials.items
      .filter(
        (material) =>
          material.quantityGrams > 0 &&
          material.stockStatus !== 'DISABLED' &&
          material.stockStatus !== 'OUT_OF_STOCK',
      )
      .map((material) => material.materialCode),
  )

  let hasCompatibleCapabilityMaterial = false

  for (const printer of printers.items) {
    const capabilities = await input.capabilities.list({
      filter: {
        printerId: printer.id,
        status: 'ACTIVE',
      },
      limit: 100,
      sort: {
        direction: 'asc',
        field: 'createdAt',
      },
    })

    if (capabilities.items.some((capability) => stockedMaterialCodes.has(capability.materialCode))) {
      hasCompatibleCapabilityMaterial = true
      break
    }
  }

  return Object.freeze({
    hasActivePrinter: printers.items.length > 0,
    hasCapacityConfigured: capacitySlots.items.length > 0,
    hasCompatibleCapabilityMaterial,
    hasStockedMaterial: stockedMaterialCodes.size > 0,
  })
}

async function listProviderServices(
  providerServices: ProviderServiceRepository,
  providerProfileId: Uuidv7,
  status?: ProviderServiceStatus,
): Promise<readonly ProviderServiceRecord[]> {
  const services = await providerServices.list({
    filter: {
      providerProfileId,
      ...(status ? { status } : {}),
    },
    limit: 100,
    sort: {
      direction: 'asc',
      field: 'createdAt',
    },
  })

  return services.items
}

function createOnboardingStep(input: Readonly<{
  code: ProviderOnboardingStepCode
  complete: boolean
  detail: string
  label: string
  required: boolean
}>): ProviderOnboardingStepDto {
  return Object.freeze({
    code: input.code,
    detail: input.detail,
    label: input.label,
    required: input.required,
    status: input.complete ? 'COMPLETE' : input.required ? 'ACTION_REQUIRED' : 'OPTIONAL',
  })
}

function canManageServiceType(
  roles: readonly UserRoleRecord[],
  serviceType: ProviderServiceType,
): boolean {
  switch (serviceType) {
    case 'DESIGN_ONLY':
      return hasDesignRole(roles)
    case 'PRINT_ONLY':
      return hasPrintRole(roles)
    case 'DESIGN_AND_PRINT':
      return hasDesignRole(roles) && hasPrintRole(roles)
  }
}

function canPublishServiceType(
  profile: ProviderProfileRecord,
  roles: readonly UserRoleRecord[],
  serviceType: ProviderServiceType,
): boolean {
  if (profile.status !== 'ACTIVE') {
    return false
  }

  return canManageServiceType(roles, serviceType)
}

function hasMeaningfulText(value: string | null | undefined): boolean {
  return typeof value === 'string' && sanitizeText(value).length > 0
}

async function ensureServicePublishable(
  dependencies: Pick<
    Dependencies,
    'capacities' | 'capabilities' | 'printers' | 'providerMaterials'
  >,
  profile: ProviderProfileRecord,
  roles: readonly UserRoleRecord[],
  service: Readonly<{
    instantOrderEnabled: boolean
    leadTimeDays: number
    serviceDescription: string
    serviceName: string
    serviceRegion: string | null
    serviceType: ProviderServiceType
  }>,
): Promise<void> {
  const fields: string[] = []

  if (!hasMeaningfulText(service.serviceName)) {
    fields.push('serviceName')
  }

  if (!hasMeaningfulText(service.serviceDescription)) {
    fields.push('serviceDescription')
  }

  if (!hasMeaningfulText(service.serviceRegion)) {
    fields.push('serviceRegion')
  }

  if (!Number.isInteger(service.leadTimeDays) || service.leadTimeDays <= 0) {
    fields.push('leadTimeDays')
  }

  if (fields.length > 0) {
    throw createValidationError(fields, 'provider service is incomplete')
  }

  if (!canPublishServiceType(profile, roles, service.serviceType)) {
    throw new AuthorizationDeniedError('คุณยังไม่พร้อมเผยแพร่บริการนี้')
  }

  if (service.instantOrderEnabled) {
    if (!isPrintCapableServiceType(service.serviceType)) {
      throw createValidationError(
        ['instantOrderEnabled'],
        'instantOrderEnabled requires a print-capable service',
      )
    }

    const readiness = await loadPrintReadiness(dependencies, profile.id)

    if (!readiness.hasCompatibleCapabilityMaterial) {
      throw createValidationError(
        ['instantOrderEnabled'],
        'instant-capable print services require an active printer, capability, and stocked material',
      )
    }
  }
}

function ensureProfilePublishable(
  roles: readonly UserRoleRecord[],
  profile: Readonly<{
    publicName: string
    serviceRegion: string | null
  }>,
): void {
  const fields: string[] = []

  if (!hasMeaningfulText(profile.publicName)) {
    fields.push('publicName')
  }

  if (!hasMeaningfulText(profile.serviceRegion)) {
    fields.push('serviceRegion')
  }

  if (fields.length > 0) {
    throw createValidationError(fields, 'provider profile is incomplete')
  }

  if (roles.length === 0) {
    throw new AuthorizationDeniedError('คุณยังไม่พร้อมเผยแพร่โปรไฟล์ผู้ให้บริการ')
  }
}

export function assertProviderVersionConflict(error: unknown): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError
}

export function createProviderServiceManager(input: Dependencies): ProviderServiceManager {
  return Object.freeze({
    async createProviderProfile(command): Promise<PublicProviderProfileDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const roles = await loadActorRoles(input.userRoles, user.id)

      if (roles.length === 0) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์สร้างโปรไฟล์ผู้ให้บริการ')
      }

      const publicName = normalizeRequiredText(command.publicName, 'publicName')
      const serviceRegion = normalizeNullableText(command.serviceRegion) ?? null
      const status = command.status ?? 'DRAFT'
      if (status === 'ACTIVE') {
        ensureProfilePublishable(roles, { publicName, serviceRegion })
      }

      const profile = await input.providerProfiles.create({
        createdBy: user.id,
        id: input.uuidGenerator.next(),
        ownerUserId: user.id,
        publicName,
        serviceRegion,
        status,
        updatedBy: user.id,
      })

      return toPublicProviderProfileDto(profile)
    },

    async createProviderService(command): Promise<ProviderServiceDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, command.providerProfileId)

      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการบริการของโปรไฟล์นี้')
      }

      const roles = await loadActorRoles(input.userRoles, user.id)
      if (!canManageServiceType(roles, command.serviceType)) {
        throw new AuthorizationDeniedError('คุณยังไม่สามารถจัดการบริการประเภทนี้ได้')
      }

      const serviceName = normalizeRequiredText(command.serviceName, 'serviceName')
      const serviceDescription = normalizeRequiredText(command.serviceDescription, 'serviceDescription')
      const leadTimeDays = normalizeLeadTimeDays(command.leadTimeDays)
      const serviceRegion = normalizeNullableText(command.serviceRegion) ?? profile.serviceRegion
      const instantOrderEnabled = command.instantOrderEnabled ?? false
      const status = command.status ?? 'DRAFT'
      if (status === 'ACTIVE') {
        await ensureServicePublishable(input, profile, roles, {
          instantOrderEnabled,
          leadTimeDays,
          serviceDescription,
          serviceName,
          serviceRegion,
          serviceType: command.serviceType,
        })
      }

      const service = await input.providerServices.create({
        createdBy: user.id,
        id: input.uuidGenerator.next(),
        instantOrderEnabled,
        leadTimeDays,
        providerProfileId: profile.id,
        serviceDescription,
        serviceName,
        serviceRegion,
        serviceType: command.serviceType,
        status,
        updatedBy: user.id,
      })

      return toProviderServiceDto(service)
    },

    async getProviderProfile({ actorUserId, profileId }): Promise<PublicProviderProfileDto> {
      const user = await loadUserOrThrow(input.users, actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, profileId)

      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์อ่านโปรไฟล์ผู้ให้บริการนี้')
      }

      return toPublicProviderProfileDto(profile)
    },

    async getProviderOnboardingOverview({
      actorUserId,
      profileId,
    }): Promise<ProviderOnboardingOverviewDto> {
      const user = await loadUserOrThrow(input.users, actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, profileId)

      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์อ่านโปรไฟล์ผู้ให้บริการนี้')
      }

      const [roles, services, approvedBadge, readiness] = await Promise.all([
        loadActorRoles(input.userRoles, user.id),
        listProviderServices(input.providerServices, profile.id),
        hasApprovedVerificationBadge(input.verificationCases, profile.ownerUserId),
        loadPrintReadiness(input, profile.id),
      ])

      const profileComplete = isProfileComplete(profile)
      const hasServices = services.length > 0
      const requiresPrintSetup = services.some((service) => isPrintCapableServiceType(service.serviceType))

      return Object.freeze({
        approvedBadge,
        canPublishDesignOnly:
          profile.status === 'ACTIVE' && profileComplete && hasDesignRole(roles),
        canPublishInstantPrint:
          profile.status === 'ACTIVE' &&
          profileComplete &&
          hasPrintRole(roles) &&
          readiness.hasCompatibleCapabilityMaterial,
        profile: toPublicProviderProfileDto(profile),
        services: services.map((service) => toProviderServiceDto(service)),
        steps: Object.freeze([
          createOnboardingStep({
            code: 'PROFILE',
            complete: profileComplete,
            detail: profileComplete
              ? 'Public name and region are ready'
              : 'Add public name and service region before publishing',
            label: 'Profile',
            required: true,
          }),
          createOnboardingStep({
            code: 'SERVICES',
            complete: hasServices,
            detail: hasServices
              ? `${services.length} service draft${services.length === 1 ? '' : 's'} configured`
              : 'Create at least one provider service',
            label: 'Services',
            required: true,
          }),
          createOnboardingStep({
            code: 'VERIFICATION',
            complete: approvedBadge,
            detail: approvedBadge
              ? 'Approved verification badge is visible to buyers'
              : 'Verification is still pending public approval badge',
            label: 'Verification',
            required: true,
          }),
          createOnboardingStep({
            code: 'PRINTER_SETUP',
            complete: readiness.hasActivePrinter,
            detail: requiresPrintSetup
              ? 'Active printers are required for print-capable services'
              : 'Skip printer setup if you only publish design services',
            label: 'Printer Setup',
            required: requiresPrintSetup,
          }),
          createOnboardingStep({
            code: 'MATERIAL_STOCK',
            complete: readiness.hasCompatibleCapabilityMaterial,
            detail: requiresPrintSetup
              ? 'Keep active capability and stocked material data aligned'
              : 'Material stock becomes required when you offer print services',
            label: 'Material Stock',
            required: requiresPrintSetup,
          }),
          createOnboardingStep({
            code: 'CAPACITY',
            complete: readiness.hasCapacityConfigured,
            detail: readiness.hasCapacityConfigured
              ? 'Capacity slots are configured for planning'
              : 'Capacity is optional now but recommended before taking live jobs',
            label: 'Capacity',
            required: false,
          }),
        ]),
      })
    },

    async getPublicProviderCard({ profileId }): Promise<PublicProviderCardDto> {
      const profile = await loadProfileOrThrow(input.providerProfiles, profileId)

      if (profile.status !== 'ACTIVE' && profile.status !== 'PAUSED') {
        throw new ProviderNotFoundError(`ProviderProfile ${profileId} is not public`)
      }

      const [services, approvedBadge, projection] = await Promise.all([
        listProviderServices(input.providerServices, profile.id, 'ACTIVE'),
        hasApprovedVerificationBadge(input.verificationCases, profile.ownerUserId),
        input.providerTrustProjections.findByProviderProfileId(profile.id),
      ])
      const trust = toProviderTrustProjectionDto(projection)
      const leadTimeDaysMin =
        services.length > 0
          ? services.reduce((minimum, service) => Math.min(minimum, service.leadTimeDays), services[0]!.leadTimeDays)
          : null
      const serviceTypes = [...new Set(services.map((service) => service.serviceType))]

      return Object.freeze({
        approvedBadge,
        id: profile.id,
        leadTimeDaysMin,
        lowSampleSize: trust.lowSampleSize,
        onTimeRatePercent: trust.onTimeRatePercent,
        portfolioPlaceholders: publicPortfolioPlaceholders,
        publicName: profile.publicName,
        ratingAverage: trust.ratingAverage,
        ratingCount: trust.ratingCount,
        serviceRegion: profile.serviceRegion,
        serviceTypes,
        sponsored: trust.sponsored,
        status: profile.status,
      })
    },

    async getProviderWorkspace({ actorUserId, profileId }): Promise<ProviderWorkspaceDto> {
      const user = await loadUserOrThrow(input.users, actorUserId)
      const profile = await loadProfileOrThrow(input.providerProfiles, profileId)

      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์อ่านโปรไฟล์ผู้ให้บริการนี้')
      }

      return Object.freeze({
        profile: toPublicProviderProfileDto(profile),
        services: (await listProviderServices(input.providerServices, profile.id)).map((service) =>
          toProviderServiceDto(service),
        ),
      })
    },

    async rebuildProviderTrustProjection(command): Promise<ProviderTrustProjectionDto> {
      const profile = await loadProfileOrThrow(input.providerProfiles, command.providerProfileId)

      if (command.actorUserId) {
        const user = await loadUserOrThrow(input.users, command.actorUserId)

        if (profile.ownerUserId !== user.id) {
          throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการข้อมูลความน่าเชื่อถือของโปรไฟล์นี้')
        }
      }

      for (const [index, job] of command.completedJobs.entries()) {
        if (job.ratingScore !== null && (job.ratingScore < 1 || job.ratingScore > 5)) {
          throw createValidationError(
            [`completedJobs.${index}.ratingScore`],
            'ratingScore must be between 1 and 5',
          )
        }
      }

      const completedJobsCount = command.completedJobs.length
      const onTimeJobsCount = command.completedJobs.filter(
        (job) => job.dueAt === null || job.completedAt <= job.dueAt,
      ).length
      const ratings = command.completedJobs
        .map((job) => job.ratingScore)
        .filter((ratingScore): ratingScore is number => ratingScore !== null)
      const ratingAverage =
        ratings.length > 0
          ? ratings.reduce((sum, ratingScore) => sum + ratingScore, 0) / ratings.length
          : null
      const ratingCount = ratings.length
      const projectionInput = Object.freeze({
        completedJobsCount,
        createdBy: command.actorUserId ?? null,
        lowSampleSize: completedJobsCount < lowSampleSizeThreshold,
        onTimeJobsCount,
        providerProfileId: profile.id,
        ratingAverage,
        ratingCount,
        sponsored:
          command.sponsored ??
          (await input.providerTrustProjections.findByProviderProfileId(profile.id))?.sponsored ??
          false,
        updatedBy: command.actorUserId ?? null,
      })

      const current = await input.providerTrustProjections.findByProviderProfileId(profile.id)
      const projection = current
        ? await input.providerTrustProjections.update(
            Object.freeze({
              ...current,
              completedJobsCount: projectionInput.completedJobsCount,
              lowSampleSize: projectionInput.lowSampleSize,
              onTimeJobsCount: projectionInput.onTimeJobsCount,
              ratingAverage: projectionInput.ratingAverage,
              ratingCount: projectionInput.ratingCount,
              sponsored: projectionInput.sponsored,
              updatedBy: projectionInput.updatedBy,
            }),
            current.version,
          )
        : await input.providerTrustProjections.create(projectionInput)

      return toProviderTrustProjectionDto(projection)
    },

    async updateProviderProfile(command): Promise<PublicProviderProfileDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const current = await loadProfileOrThrow(input.providerProfiles, command.profileId)

      if (current.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการโปรไฟล์ผู้ให้บริการนี้')
      }

      const roles = await loadActorRoles(input.userRoles, user.id)
      const nextStatus = command.status ?? current.status
      const nextPublicName =
        command.publicName === undefined
          ? current.publicName
          : normalizeRequiredText(command.publicName ?? '', 'publicName')
      const nextServiceRegion =
        command.serviceRegion === undefined
          ? current.serviceRegion
          : normalizeNullableText(command.serviceRegion) ?? null
      if (nextStatus === 'ACTIVE') {
        ensureProfilePublishable(roles, {
          publicName: nextPublicName,
          serviceRegion: nextServiceRegion,
        })
      }

      const updated = await input.providerProfiles.update(
        Object.freeze({
          ...current,
          publicName: nextPublicName,
          serviceRegion: nextServiceRegion,
          status: nextStatus,
          updatedBy: user.id,
        }),
        command.expectedVersion,
      )

      return toPublicProviderProfileDto(updated)
    },

    async updateProviderService(command): Promise<ProviderServiceDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const current = await loadServiceOrThrow(input.providerServices, command.serviceId)
      const profile = await loadProfileOrThrow(input.providerProfiles, current.providerProfileId)

      if (profile.ownerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการบริการของโปรไฟล์นี้')
      }

      const roles = await loadActorRoles(input.userRoles, user.id)
      const nextStatus = command.status ?? current.status
      const nextServiceName =
        command.serviceName === undefined
          ? current.serviceName
          : normalizeRequiredText(command.serviceName ?? '', 'serviceName')
      const nextServiceDescription =
        command.serviceDescription === undefined
          ? current.serviceDescription
          : normalizeRequiredText(command.serviceDescription ?? '', 'serviceDescription')
      const nextLeadTimeDays =
        command.leadTimeDays === undefined
          ? current.leadTimeDays
          : normalizeLeadTimeDays(command.leadTimeDays)
      const nextInstantOrderEnabled = command.instantOrderEnabled ?? current.instantOrderEnabled
      const nextServiceRegion =
        command.serviceRegion === undefined
          ? current.serviceRegion
          : normalizeNullableText(command.serviceRegion) ?? null
      if (nextStatus === 'ACTIVE') {
        await ensureServicePublishable(input, profile, roles, {
          instantOrderEnabled: nextInstantOrderEnabled,
          leadTimeDays: nextLeadTimeDays,
          serviceDescription: nextServiceDescription,
          serviceName: nextServiceName,
          serviceRegion: nextServiceRegion,
          serviceType: current.serviceType,
        })
      }

      const updated = await input.providerServices.update(
        Object.freeze({
          ...current,
          instantOrderEnabled: nextInstantOrderEnabled,
          leadTimeDays: nextLeadTimeDays,
          serviceDescription: nextServiceDescription,
          serviceName: nextServiceName,
          serviceRegion: nextServiceRegion,
          status: nextStatus,
          updatedBy: user.id,
        }),
        command.expectedVersion,
      )

      return toProviderServiceDto(updated)
    },
  })
}
