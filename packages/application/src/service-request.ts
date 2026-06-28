import {
  AuthorizationDeniedError,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'
import {
  RepositoryConflictError,
  createMoneyMinor,
  type FileAssetAccessGrantRepository,
  type MoneyMinor,
  type ProviderServiceType,
  type ServiceRequestAttachmentRecord,
  type ServiceRequestRecord,
  type ServiceRequestRepository,
  type ServiceRequestStatus,
  type ServiceRequestStatusHistoryEntry,
  type ServiceRequestVisibility,
  type UserRecord,
  type UserRepository,
  type UserRoleRecord,
  type UserRoleRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type ServiceRequestAttachmentDto = Readonly<{
  assetId: Uuidv7
  mimeType: string | null
  originalFilename: string | null
  sizeBytes: number | null
}>

export type ServiceRequestStatusHistoryDto = Readonly<{
  changedAt: UtcTimestamp
  changedBy: Uuidv7 | null
  fromStatus: ServiceRequestStatus | null
  note: string | null
  toStatus: ServiceRequestStatus
}>

export type ServiceRequestDto = Readonly<{
  attachments: readonly ServiceRequestAttachmentDto[]
  budget: MoneyMinor | null
  buyerUserId: Uuidv7
  category: string | null
  closedAt: UtcTimestamp | null
  description: string | null
  dueAt: UtcTimestamp | null
  id: Uuidv7
  objective: string | null
  organizationId: Uuidv7 | null
  prohibitedWorkAcknowledged: boolean
  publishedAt: UtcTimestamp | null
  quantity: number | null
  serviceRegion: string | null
  serviceType: ProviderServiceType | null
  status: ServiceRequestStatus
  statusHistory: readonly ServiceRequestStatusHistoryDto[]
  title: string | null
  version: number
  visibility: ServiceRequestVisibility
}>

export type ServiceRequestValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export class ServiceRequestNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'ServiceRequestNotFoundError'
  }
}

export class InvalidServiceRequestStateError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION'
  readonly fields: readonly string[]
  readonly status = 409

  constructor(message: string, fields: readonly string[] = ['status']) {
    super(message)
    this.name = 'InvalidServiceRequestStateError'
    this.fields = fields
  }
}

export type ServiceRequestAttachmentInput = Readonly<{
  assetId: Uuidv7
  mimeType?: string | null | undefined
  originalFilename?: string | null | undefined
  sizeBytes?: number | null | undefined
}>

export type CreateServiceRequestDraftCommand = Readonly<{
  actorUserId: Uuidv7
  attachments?: readonly ServiceRequestAttachmentInput[] | undefined
  budgetCurrency?: string | null | undefined
  budgetMinor?: number | null | undefined
  category?: string | null | undefined
  description?: string | null | undefined
  dueAt?: UtcTimestamp | null | undefined
  objective?: string | null | undefined
  organizationId?: Uuidv7 | null | undefined
  prohibitedWorkAcknowledged?: boolean | undefined
  quantity?: number | null | undefined
  serviceRegion?: string | null | undefined
  serviceType?: ProviderServiceType | null | undefined
  title?: string | null | undefined
  visibility?: ServiceRequestVisibility | undefined
}>

export type UpdateServiceRequestDraftCommand = Readonly<{
  actorUserId: Uuidv7
  attachments?: readonly ServiceRequestAttachmentInput[] | undefined
  budgetCurrency?: string | null | undefined
  budgetMinor?: number | null | undefined
  category?: string | null | undefined
  description?: string | null | undefined
  dueAt?: UtcTimestamp | null | undefined
  expectedVersion: number
  objective?: string | null | undefined
  organizationId?: Uuidv7 | null | undefined
  prohibitedWorkAcknowledged?: boolean | undefined
  quantity?: number | null | undefined
  requestId: Uuidv7
  serviceRegion?: string | null | undefined
  serviceType?: ProviderServiceType | null | undefined
  title?: string | null | undefined
  visibility?: ServiceRequestVisibility | undefined
}>

export type PublishServiceRequestCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  requestId: Uuidv7
}>

export type CloseServiceRequestCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  note?: string | null | undefined
  requestId: Uuidv7
}>

export type ServiceRequestService = Readonly<{
  closeRequest(input: CloseServiceRequestCommand): Promise<ServiceRequestDto>
  createDraft(input: CreateServiceRequestDraftCommand): Promise<ServiceRequestDto>
  getRequest(input: Readonly<{ actorUserId: Uuidv7; requestId: Uuidv7 }>): Promise<ServiceRequestDto>
  publishRequest(input: PublishServiceRequestCommand): Promise<ServiceRequestDto>
  updateDraft(input: UpdateServiceRequestDraftCommand): Promise<ServiceRequestDto>
}>

type Dependencies = Readonly<{
  clock: ClockPort
  fileAssetAccessGrants?: FileAssetAccessGrantRepository
  serviceRequests: ServiceRequestRepository
  userRoles: UserRoleRepository
  users: UserRepository
  uuidGenerator: UuidGeneratorPort
}>

function createValidationError(
  fields: readonly string[],
  message: string,
): ServiceRequestValidationError {
  const error = new Error(message) as Error & {
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }

  Object.assign(error, {
    code: 'VALIDATION_ERROR' as const,
    fields,
    name: 'ServiceRequestValidationError',
    status: 400 as const,
  })

  return error as ServiceRequestValidationError
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

function normalizeQuantity(value: number | null | undefined): number | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw createValidationError(['quantity'], 'quantity must be greater than zero')
  }
  return value
}

function normalizeBudget(
  budgetMinor: number | null | undefined,
  budgetCurrency: string | null | undefined,
): MoneyMinor | null | undefined {
  if (budgetMinor === undefined && budgetCurrency === undefined) {
    return undefined
  }
  if (budgetMinor === null && budgetCurrency === null) {
    return null
  }
  if (typeof budgetMinor !== 'number' || !Number.isInteger(budgetMinor) || budgetMinor < 0) {
    throw createValidationError(['budgetMinor'], 'budgetMinor must be zero or greater')
  }
  if (!sanitizeText(budgetCurrency ?? '')) {
    throw createValidationError(['budgetCurrency'], 'budgetCurrency is required when budgetMinor is set')
  }
  return createMoneyMinor(budgetMinor, budgetCurrency ?? '')
}

function normalizeDueAt(clock: ClockPort, dueAt: UtcTimestamp | null | undefined): UtcTimestamp | null | undefined {
  if (dueAt === undefined) {
    return undefined
  }
  if (dueAt === null) {
    return null
  }
  if (Date.parse(dueAt) <= Date.parse(clock.now())) {
    throw createValidationError(['dueAt'], 'dueAt must be in the future')
  }
  return dueAt
}

function normalizeAttachments(
  attachments: readonly ServiceRequestAttachmentInput[] | undefined,
): readonly ServiceRequestAttachmentRecord[] | undefined {
  if (attachments === undefined) {
    return undefined
  }

  return attachments.map((attachment, index) => {
    const originalFilename = normalizeNullableText(attachment.originalFilename) ?? null
    const mimeType = normalizeNullableText(attachment.mimeType) ?? null
    if (
      attachment.sizeBytes !== undefined &&
      attachment.sizeBytes !== null &&
      (!Number.isInteger(attachment.sizeBytes) || attachment.sizeBytes < 0)
    ) {
      throw createValidationError(
        [`attachments.${index}.sizeBytes`],
        'attachment sizeBytes must be zero or greater',
      )
    }

    return Object.freeze({
      assetId: attachment.assetId,
      mimeType,
      originalFilename,
      sizeBytes: attachment.sizeBytes ?? null,
    })
  })
}

function toStatusHistoryEntry(
  changedAt: UtcTimestamp,
  changedBy: Uuidv7,
  fromStatus: ServiceRequestStatus | null,
  toStatus: ServiceRequestStatus,
  note?: string | null,
): ServiceRequestStatusHistoryEntry {
  return Object.freeze({
    changedAt,
    changedBy,
    fromStatus,
    note: normalizeNullableText(note) ?? null,
    toStatus,
  })
}

function toServiceRequestDto(record: ServiceRequestRecord): ServiceRequestDto {
  return Object.freeze({
    attachments: record.attachments.map((attachment) => Object.freeze({ ...attachment })),
    budget: record.budget ? Object.freeze({ ...record.budget }) : null,
    buyerUserId: record.buyerUserId,
    category: record.category,
    closedAt: record.closedAt,
    description: record.description,
    dueAt: record.dueAt,
    id: record.id,
    objective: record.objective,
    organizationId: record.organizationId,
    prohibitedWorkAcknowledged: record.prohibitedWorkAcknowledged,
    publishedAt: record.publishedAt,
    quantity: record.quantity,
    serviceRegion: record.serviceRegion,
    serviceType: record.serviceType,
    status: record.status,
    statusHistory: record.statusHistory.map((entry) => Object.freeze({ ...entry })),
    title: record.title,
    version: record.version,
    visibility: record.visibility,
  })
}

async function loadUserOrThrow(users: UserRepository, userId: Uuidv7): Promise<UserRecord> {
  const user = await users.findById(userId)

  if (!user) {
    throw new ServiceRequestNotFoundError(`User ${userId} was not found`)
  }
  if (user.status !== 'ACTIVE') {
    throw new AuthorizationDeniedError()
  }
  return user
}

async function loadRequestOrThrow(
  serviceRequests: ServiceRequestRepository,
  requestId: Uuidv7,
): Promise<ServiceRequestRecord> {
  const record = await serviceRequests.findById(requestId)

  if (!record) {
    throw new ServiceRequestNotFoundError(`ServiceRequest ${requestId} was not found`)
  }

  return record
}

async function loadBuyerRoles(
  userRoles: UserRoleRepository,
  userId: Uuidv7,
): Promise<readonly UserRoleRecord[]> {
  return (await userRoles.listByUserId(userId)).filter(
    (role) => role.status === 'ACTIVE' && role.roleCode === 'BUYER',
  )
}

function ensureBuyerRole(roles: readonly UserRoleRecord[]): void {
  if (roles.length === 0) {
    throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์สร้างคำขอรับบริการ')
  }
}

function ensureDraftPublishable(
  record: Readonly<{
    budget: MoneyMinor | null
    description: string | null
    dueAt: UtcTimestamp | null
    prohibitedWorkAcknowledged: boolean
    serviceRegion: string | null
    serviceType: ProviderServiceType | null
    title: string | null
  }>,
): void {
  const fields: string[] = []

  if (!normalizeNullableText(record.title)) {
    fields.push('title')
  }
  if (!normalizeNullableText(record.description)) {
    fields.push('description')
  }
  if (!record.serviceType) {
    fields.push('serviceType')
  }
  if (!record.serviceRegion) {
    fields.push('serviceRegion')
  }
  if (!record.dueAt) {
    fields.push('dueAt')
  }
  if (!record.budget) {
    fields.push('budgetMinor', 'budgetCurrency')
  }
  if (!record.prohibitedWorkAcknowledged) {
    fields.push('prohibitedWorkAcknowledged')
  }

  if (fields.length > 0) {
    throw createValidationError(fields, 'service request draft is incomplete')
  }
}

function canReadRequest(actorUserId: Uuidv7, record: ServiceRequestRecord): boolean {
  if (record.buyerUserId === actorUserId) {
    return true
  }

  return record.status === 'PUBLISHED' && record.visibility === 'PUBLIC'
}

export function assertServiceRequestVersionConflict(error: unknown): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError
}

export function createServiceRequestService(input: Dependencies): ServiceRequestService {
  return Object.freeze({
    async createDraft(command): Promise<ServiceRequestDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      ensureBuyerRole(await loadBuyerRoles(input.userRoles, user.id))

      const budget = normalizeBudget(command.budgetMinor, command.budgetCurrency)
      const dueAt = normalizeDueAt(input.clock, command.dueAt)
      const attachments = normalizeAttachments(command.attachments)
      const now = input.clock.now()
      const statusHistory = Object.freeze([
        toStatusHistoryEntry(now, user.id, null, 'DRAFT', 'Draft created'),
      ])

      const created = await input.serviceRequests.create({
        budget: budget ?? null,
        buyerUserId: user.id,
        category: normalizeNullableText(command.category) ?? null,
        createdBy: user.id,
        description: normalizeNullableText(command.description) ?? null,
        dueAt: dueAt ?? null,
        id: input.uuidGenerator.next(),
        objective: normalizeNullableText(command.objective) ?? null,
        organizationId: command.organizationId ?? null,
        prohibitedWorkAcknowledged: command.prohibitedWorkAcknowledged ?? false,
        quantity: normalizeQuantity(command.quantity) ?? null,
        serviceRegion: normalizeNullableText(command.serviceRegion) ?? null,
        serviceType: command.serviceType ?? null,
        status: 'DRAFT',
        statusHistory,
        title: normalizeNullableText(command.title) ?? null,
        updatedBy: user.id,
        visibility: command.visibility ?? 'PRIVATE_DIRECT',
        ...(attachments ? { attachments } : {}),
      })

      return toServiceRequestDto(created)
    },

    async getRequest({ actorUserId, requestId }): Promise<ServiceRequestDto> {
      const user = await loadUserOrThrow(input.users, actorUserId)
      const record = await loadRequestOrThrow(input.serviceRequests, requestId)

      if (!canReadRequest(user.id, record)) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์อ่านคำขอรับบริการนี้')
      }

      return toServiceRequestDto(record)
    },

    async updateDraft(command): Promise<ServiceRequestDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const record = await loadRequestOrThrow(input.serviceRequests, command.requestId)

      if (record.buyerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์แก้ไขคำขอรับบริการนี้')
      }
      ensureBuyerRole(await loadBuyerRoles(input.userRoles, user.id))

      if (record.status !== 'DRAFT') {
        throw new InvalidServiceRequestStateError('published request cannot be edited outside change policy')
      }

      const budget = normalizeBudget(command.budgetMinor, command.budgetCurrency)
      const dueAt = normalizeDueAt(input.clock, command.dueAt)
      const attachments = normalizeAttachments(command.attachments)

      const updated = await input.serviceRequests.update(
        Object.freeze({
          ...record,
          attachments: attachments ?? record.attachments,
          budget:
            budget === undefined
              ? record.budget
              : budget,
          category:
            command.category === undefined
              ? record.category
              : normalizeNullableText(command.category) ?? null,
          description:
            command.description === undefined
              ? record.description
              : normalizeNullableText(command.description) ?? null,
          dueAt: dueAt === undefined ? record.dueAt : dueAt,
          objective:
            command.objective === undefined
              ? record.objective
              : normalizeNullableText(command.objective) ?? null,
          organizationId:
            command.organizationId === undefined ? record.organizationId : command.organizationId,
          prohibitedWorkAcknowledged:
            command.prohibitedWorkAcknowledged ?? record.prohibitedWorkAcknowledged,
          quantity:
            command.quantity === undefined
              ? record.quantity
              : normalizeQuantity(command.quantity) ?? null,
          serviceRegion:
            command.serviceRegion === undefined
              ? record.serviceRegion
              : normalizeNullableText(command.serviceRegion) ?? null,
          serviceType: command.serviceType === undefined ? record.serviceType : command.serviceType,
          title:
            command.title === undefined
              ? record.title
              : normalizeNullableText(command.title) ?? null,
          updatedBy: user.id,
          visibility: command.visibility ?? record.visibility,
        }),
        command.expectedVersion,
      )

      return toServiceRequestDto(updated)
    },

    async publishRequest(command): Promise<ServiceRequestDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const record = await loadRequestOrThrow(input.serviceRequests, command.requestId)

      if (record.buyerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์เผยแพร่คำขอรับบริการนี้')
      }
      ensureBuyerRole(await loadBuyerRoles(input.userRoles, user.id))

      if (record.status !== 'DRAFT') {
        throw new InvalidServiceRequestStateError('service request is already published or closed')
      }

      ensureDraftPublishable(record)
      const now = input.clock.now()
      const published = await input.serviceRequests.update(
        Object.freeze({
          ...record,
          publishedAt: now,
          status: 'PUBLISHED',
          statusHistory: [
            ...record.statusHistory,
            toStatusHistoryEntry(now, user.id, record.status, 'PUBLISHED', 'Request published'),
          ],
          updatedBy: user.id,
        }),
        command.expectedVersion,
      )

      return toServiceRequestDto(published)
    },

    async closeRequest(command): Promise<ServiceRequestDto> {
      const user = await loadUserOrThrow(input.users, command.actorUserId)
      const record = await loadRequestOrThrow(input.serviceRequests, command.requestId)

      if (record.buyerUserId !== user.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์ปิดคำขอรับบริการนี้')
      }

      if (record.status !== 'PUBLISHED') {
        throw new InvalidServiceRequestStateError('only published requests can be closed')
      }

      const now = input.clock.now()
      const closed = await input.serviceRequests.update(
        Object.freeze({
          ...record,
          closedAt: now,
          status: 'CLOSED',
          statusHistory: [
            ...record.statusHistory,
            toStatusHistoryEntry(now, user.id, record.status, 'CLOSED', command.note),
          ],
          updatedBy: user.id,
        }),
        command.expectedVersion,
      )

      if (input.fileAssetAccessGrants) {
        let cursor: string | undefined

        do {
          const listRequest = {
            ...(cursor ? { cursor } : {}),
            filter: {
              activeAt: now,
              contextId: record.id,
              contextType: 'SERVICE_REQUEST_INVITE' as const,
            },
            limit: 100,
            sort: {
              direction: 'asc' as const,
              field: 'createdAt' as const,
            },
          }
          const page = await input.fileAssetAccessGrants.list(listRequest)

          for (const grant of page.items) {
            await input.fileAssetAccessGrants.update(
              Object.freeze({
                ...grant,
                revokedAt: now,
                revokedReason: 'SERVICE_REQUEST_CLOSED',
                updatedBy: user.id,
              }),
              grant.version,
            )
          }

          cursor = page.nextCursor ?? undefined
        } while (cursor)
      }

      return toServiceRequestDto(closed)
    },
  })
}
