import {
  AuthorizationDeniedError,
  type AuditSinkPort,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'
import { RepositoryConflictError } from '@pim/domain'
import {
  parseUtcTimestamp,
  type FileAssetGrantPermissionCode,
  type FileAssetAccessGrantRecord,
  type FileAssetAccessGrantRepository,
  type FileAssetGrantContextType,
  type FileAssetRecord,
  type FileAssetRepository,
  type FileAssetStatus,
  type FileAssetVisibility,
  type ServiceRequestRecord,
  type ServiceRequestRepository,
  type UserRecord,
  type UserRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type FileAssetDto = Readonly<{
  checksumSha256: string | null
  id: Uuidv7
  mimeType: string
  objectKey: string
  organizationId: Uuidv7 | null
  originalFilename: string
  ownerUserId: Uuidv7
  purpose: string
  sizeBytes: number
  sourceAssetId: Uuidv7 | null
  status: FileAssetStatus
  storageProvider: string
  version: number
  visibility: FileAssetVisibility
}>

export type FileAssetAccessGrantDto = Readonly<{
  assetId: Uuidv7
  contextId: Uuidv7
  contextType: FileAssetGrantContextType
  expiresAt: UtcTimestamp
  grantedByUserId: Uuidv7
  granteeUserId: Uuidv7
  id: Uuidv7
  permissionCode: FileAssetGrantPermissionCode
  revokedAt: UtcTimestamp | null
  revokedReason: string | null
  version: number
}>

export type FileAssetDownloadAccessDto = Readonly<{
  assetId: Uuidv7
  downloadUrl: string
  expiresAt: UtcTimestamp
}>

export type FileAccessValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export class FileAccessNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'FileAccessNotFoundError'
  }
}

export class InvalidFileAccessStateError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION'
  readonly fields: readonly string[]
  readonly status = 409

  constructor(message: string, fields: readonly string[] = ['status']) {
    super(message)
    this.name = 'InvalidFileAccessStateError'
    this.fields = fields
  }
}

export type RegisterFileAssetCommand = Readonly<{
  actorUserId: Uuidv7
  checksumSha256?: string | null | undefined
  mimeType: string
  objectKey: string
  organizationId?: Uuidv7 | null | undefined
  originalFilename: string
  purpose: string
  sizeBytes: number
  sourceAssetId?: Uuidv7 | null | undefined
  status?: FileAssetStatus | undefined
  storageProvider: string
  visibility?: FileAssetVisibility | undefined
}>

export type CreateFileAssetAccessGrantCommand = Readonly<{
  actorUserId: Uuidv7
  assetId: Uuidv7
  contextId: Uuidv7
  contextType: FileAssetGrantContextType
  expiresAt: UtcTimestamp
  granteeUserId: Uuidv7
  permissionCode?: FileAssetGrantPermissionCode | undefined
}>

export type RequestFileAssetDownloadAccessCommand = Readonly<{
  actorUserId: Uuidv7
  assetId: Uuidv7
}>

export type RevokeFileAssetAccessGrantCommand = Readonly<{
  actorUserId: Uuidv7
  expectedVersion: number
  grantId: Uuidv7
  reason: string
}>

export type FileAssetDownloadSignerPort = Readonly<{
  createSignedDownloadUrl(input: Readonly<{
    actorUserId: Uuidv7
    assetId: Uuidv7
    expiresAt: UtcTimestamp
    mimeType: string
    objectKey: string
    originalFilename: string
    storageProvider: string
  }>): Promise<string> | string
}>

export type FileAccessService = Readonly<{
  createAccessGrant(input: CreateFileAssetAccessGrantCommand): Promise<FileAssetAccessGrantDto>
  registerAsset(input: RegisterFileAssetCommand): Promise<FileAssetDto>
  requestDownloadAccess(
    input: RequestFileAssetDownloadAccessCommand,
  ): Promise<FileAssetDownloadAccessDto>
  revokeAccessGrant(input: RevokeFileAssetAccessGrantCommand): Promise<FileAssetAccessGrantDto>
}>

type Dependencies = Readonly<{
  auditSink?: AuditSinkPort
  clock: ClockPort
  fileAssetAccessGrants: FileAssetAccessGrantRepository
  fileAssets: FileAssetRepository
  serviceRequests: ServiceRequestRepository
  urlSigner: FileAssetDownloadSignerPort
  users: UserRepository
  uuidGenerator: UuidGeneratorPort
}>

const noopAuditSink: AuditSinkPort = Object.freeze({
  record() {
    return undefined
  },
})

function createValidationError(
  fields: readonly string[],
  message: string,
): FileAccessValidationError {
  const error = new Error(message) as Error & {
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }

  Object.assign(error, {
    code: 'VALIDATION_ERROR' as const,
    fields,
    name: 'FileAccessValidationError',
    status: 400 as const,
  })

  return error as FileAccessValidationError
}

function sanitizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeRequiredText(value: string, field: string): string {
  const normalized = sanitizeText(value)
  if (!normalized) {
    throw createValidationError([field], `${field} is required`)
  }
  return normalized
}

function normalizeNullableChecksum(checksumSha256: string | null | undefined): string | null {
  if (checksumSha256 === undefined || checksumSha256 === null) {
    return null
  }

  const normalized = checksumSha256.trim().toLowerCase()
  if (normalized.length === 0) {
    return null
  }
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw createValidationError(['checksumSha256'], 'checksumSha256 must be a 64-character hex string')
  }
  return normalized
}

function normalizeSizeBytes(sizeBytes: number): number {
  if (!Number.isInteger(sizeBytes) || sizeBytes < 0) {
    throw createValidationError(['sizeBytes'], 'sizeBytes must be zero or greater')
  }
  return sizeBytes
}

function normalizeExpiry(clock: ClockPort, expiresAt: UtcTimestamp): UtcTimestamp {
  if (Date.parse(expiresAt) <= Date.parse(clock.now())) {
    throw createValidationError(['expiresAt'], 'expiresAt must be in the future')
  }
  return expiresAt
}

function addMinutes(value: UtcTimestamp, minutes: number): UtcTimestamp {
  const expiresAt = new Date(Date.parse(value))
  expiresAt.setUTCMinutes(expiresAt.getUTCMinutes() + minutes)
  return parseUtcTimestamp(expiresAt)
}

function toFileAssetDto(record: FileAssetRecord): FileAssetDto {
  return Object.freeze({
    checksumSha256: record.checksumSha256,
    id: record.id,
    mimeType: record.mimeType,
    objectKey: record.objectKey,
    organizationId: record.organizationId,
    originalFilename: record.originalFilename,
    ownerUserId: record.ownerUserId,
    purpose: record.purpose,
    sizeBytes: record.sizeBytes,
    sourceAssetId: record.sourceAssetId,
    status: record.status,
    storageProvider: record.storageProvider,
    version: record.version,
    visibility: record.visibility,
  })
}

function toFileAssetAccessGrantDto(record: FileAssetAccessGrantRecord): FileAssetAccessGrantDto {
  return Object.freeze({
    assetId: record.assetId,
    contextId: record.contextId,
    contextType: record.contextType,
    expiresAt: record.expiresAt,
    grantedByUserId: record.grantedByUserId,
    granteeUserId: record.granteeUserId,
    id: record.id,
    permissionCode: record.permissionCode,
    revokedAt: record.revokedAt,
    revokedReason: record.revokedReason,
    version: record.version,
  })
}

async function loadUserOrThrow(users: UserRepository, userId: Uuidv7): Promise<UserRecord> {
  const user = await users.findById(userId)
  if (!user) {
    throw new FileAccessNotFoundError(`User ${userId} was not found`)
  }
  if (user.status !== 'ACTIVE') {
    throw new AuthorizationDeniedError()
  }
  return user
}

async function loadAssetOrThrow(fileAssets: FileAssetRepository, assetId: Uuidv7): Promise<FileAssetRecord> {
  const asset = await fileAssets.findById(assetId)
  if (!asset) {
    throw new FileAccessNotFoundError(`File asset ${assetId} was not found`)
  }
  return asset
}

async function loadGrantOrThrow(
  fileAssetAccessGrants: FileAssetAccessGrantRepository,
  grantId: Uuidv7,
): Promise<FileAssetAccessGrantRecord> {
  const grant = await fileAssetAccessGrants.findById(grantId)
  if (!grant) {
    throw new FileAccessNotFoundError(`File asset access grant ${grantId} was not found`)
  }
  return grant
}

async function loadServiceRequestOrThrow(
  serviceRequests: ServiceRequestRepository,
  requestId: Uuidv7,
): Promise<ServiceRequestRecord> {
  const request = await serviceRequests.findById(requestId)
  if (!request) {
    throw new FileAccessNotFoundError(`Service request ${requestId} was not found`)
  }
  return request
}

async function recordAudit(
  auditSink: AuditSinkPort | undefined,
  input: Readonly<{
    asset: FileAssetRecord
    details: Readonly<Record<string, string | number | boolean | null>>
    occurredAt: UtcTimestamp
    type: string
    userId: Uuidv7
  }>,
): Promise<void> {
  await (auditSink ?? noopAuditSink).record({
    details: Object.freeze({
      assetId: input.asset.id,
      assetVisibility: input.asset.visibility,
      ...input.details,
    }),
    occurredAt: input.occurredAt,
    type: input.type,
    userId: input.userId,
  })
}

async function ensureServiceRequestInviteContext(
  input: Pick<Dependencies, 'serviceRequests'>,
  actor: UserRecord,
  asset: FileAssetRecord,
  contextId: Uuidv7,
): Promise<void> {
  const request = await loadServiceRequestOrThrow(input.serviceRequests, contextId)

  if (request.buyerUserId !== actor.id) {
    throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการสิทธิ์เข้าถึงไฟล์ของคำขอนี้')
  }
  if (request.visibility !== 'INVITE_ONLY') {
    throw new InvalidFileAccessStateError(
      'service request must be invite-only before granting invite access',
      ['contextId'],
    )
  }
  if (request.status !== 'PUBLISHED') {
    throw new InvalidFileAccessStateError(
      'service request must be published before granting invite access',
      ['contextId'],
    )
  }
  if (!request.attachments.some((attachment) => attachment.assetId === asset.id)) {
    throw createValidationError(['assetId', 'contextId'], 'asset must be attached to the service request')
  }
}

async function ensureGrantContextAllowed(
  input: Pick<Dependencies, 'serviceRequests'>,
  actor: UserRecord,
  asset: FileAssetRecord,
  command: CreateFileAssetAccessGrantCommand,
): Promise<void> {
  switch (command.contextType) {
    case 'SERVICE_REQUEST_INVITE':
      await ensureServiceRequestInviteContext(input, actor, asset, command.contextId)
      return
    case 'PROPOSAL_REVIEW':
    case 'ORDER_PARTICIPANT':
    case 'STAFF_AUDIT':
      return
  }
}

async function isGrantContextActive(
  input: Pick<Dependencies, 'serviceRequests'>,
  asset: FileAssetRecord,
  grant: FileAssetAccessGrantRecord,
): Promise<boolean> {
  switch (grant.contextType) {
    case 'SERVICE_REQUEST_INVITE': {
      const request = await input.serviceRequests.findById(grant.contextId)
      return Boolean(
        request &&
          request.status === 'PUBLISHED' &&
          request.visibility === 'INVITE_ONLY' &&
          request.attachments.some((attachment) => attachment.assetId === asset.id),
      )
    }
    case 'PROPOSAL_REVIEW':
    case 'ORDER_PARTICIPANT':
    case 'STAFF_AUDIT':
      return true
  }
}

async function listActiveGrants(
  fileAssetAccessGrants: FileAssetAccessGrantRepository,
  actorUserId: Uuidv7,
  assetId: Uuidv7,
  activeAt: UtcTimestamp,
): Promise<readonly FileAssetAccessGrantRecord[]> {
  const results: FileAssetAccessGrantRecord[] = []
  let cursor: string | undefined

  do {
    const listRequest = {
      ...(cursor ? { cursor } : {}),
      filter: {
        activeAt,
        assetId,
        granteeUserId: actorUserId,
      },
      limit: 100,
      sort: {
        direction: 'asc' as const,
        field: 'createdAt' as const,
      },
    }
    const page = await fileAssetAccessGrants.list(listRequest)

    results.push(...page.items)
    cursor = page.nextCursor ?? undefined
  } while (cursor)

  return results
}

export function assertFileAccessVersionConflict(error: unknown): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError
}

export function createFileAccessService(input: Dependencies): FileAccessService {
  return Object.freeze({
    async registerAsset(command): Promise<FileAssetDto> {
      const actor = await loadUserOrThrow(input.users, command.actorUserId)

      const mimeType = normalizeRequiredText(command.mimeType, 'mimeType')
      const objectKey = normalizeRequiredText(command.objectKey, 'objectKey')
      const originalFilename = normalizeRequiredText(command.originalFilename, 'originalFilename')
      const purpose = normalizeRequiredText(command.purpose, 'purpose')
      const storageProvider = normalizeRequiredText(command.storageProvider, 'storageProvider')
      const checksumSha256 = normalizeNullableChecksum(command.checksumSha256)
      const sizeBytes = normalizeSizeBytes(command.sizeBytes)
      const visibility = command.visibility ?? 'PRIVATE'
      const sourceAssetId = command.sourceAssetId ?? null

      if (visibility === 'PUBLIC_PREVIEW' && sourceAssetId) {
        const sourceAsset = await loadAssetOrThrow(input.fileAssets, sourceAssetId)
        if (sourceAsset.visibility !== 'PUBLIC_PREVIEW' && sourceAsset.objectKey === objectKey) {
          throw createValidationError(
            ['sourceAssetId', 'objectKey'],
            'public preview assets must use a derived object key instead of reusing a private source asset directly',
          )
        }
      }

      const created = await input.fileAssets.create({
        checksumSha256,
        createdBy: actor.id,
        id: input.uuidGenerator.next(),
        mimeType,
        objectKey,
        organizationId: command.organizationId ?? null,
        originalFilename,
        ownerUserId: actor.id,
        purpose,
        sizeBytes,
        sourceAssetId,
        status: command.status ?? 'READY',
        storageProvider,
        updatedBy: actor.id,
        visibility,
      })

      return toFileAssetDto(created)
    },

    async createAccessGrant(command): Promise<FileAssetAccessGrantDto> {
      const actor = await loadUserOrThrow(input.users, command.actorUserId)
      const asset = await loadAssetOrThrow(input.fileAssets, command.assetId)
      await loadUserOrThrow(input.users, command.granteeUserId)

      if (asset.ownerUserId !== actor.id) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์มอบสิทธิ์เข้าถึงไฟล์นี้')
      }

      const expiresAt = normalizeExpiry(input.clock, command.expiresAt)
      await ensureGrantContextAllowed(input, actor, asset, {
        ...command,
        expiresAt,
      })

      const created = await input.fileAssetAccessGrants.create({
        assetId: asset.id,
        contextId: command.contextId,
        contextType: command.contextType,
        createdBy: actor.id,
        expiresAt,
        grantedByUserId: actor.id,
        granteeUserId: command.granteeUserId,
        id: input.uuidGenerator.next(),
        permissionCode: command.permissionCode ?? 'READ',
        updatedBy: actor.id,
      })

      await recordAudit(input.auditSink, {
        asset,
        details: Object.freeze({
          contextId: command.contextId,
          contextType: command.contextType,
          grantId: created.id,
          granteeUserId: command.granteeUserId,
          permissionCode: created.permissionCode,
        }),
        occurredAt: input.clock.now(),
        type: 'file.access.grant_created',
        userId: actor.id,
      })

      return toFileAssetAccessGrantDto(created)
    },

    async requestDownloadAccess(command): Promise<FileAssetDownloadAccessDto> {
      const actor = await loadUserOrThrow(input.users, command.actorUserId)
      const asset = await loadAssetOrThrow(input.fileAssets, command.assetId)
      const now = input.clock.now()
      let grant: FileAssetAccessGrantRecord | null = null

      if (asset.ownerUserId !== actor.id) {
        const activeGrants = await listActiveGrants(
          input.fileAssetAccessGrants,
          actor.id,
          asset.id,
          now,
        )

        for (const candidate of activeGrants) {
          if (await isGrantContextActive(input, asset, candidate)) {
            grant = candidate
            break
          }
        }

        if (!grant) {
          throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์เข้าถึงไฟล์นี้')
        }
      }

      const expiresAt = addMinutes(now, 10)
      const downloadUrl = await input.urlSigner.createSignedDownloadUrl({
        actorUserId: actor.id,
        assetId: asset.id,
        expiresAt,
        mimeType: asset.mimeType,
        objectKey: asset.objectKey,
        originalFilename: asset.originalFilename,
        storageProvider: asset.storageProvider,
      })

      await recordAudit(input.auditSink, {
        asset,
        details: Object.freeze({
          accessPath: grant ? 'GRANT' : 'OWNER',
          contextId: grant?.contextId ?? null,
          contextType: grant?.contextType ?? null,
          grantId: grant?.id ?? null,
        }),
        occurredAt: now,
        type: 'file.access.authorized',
        userId: actor.id,
      })

      return Object.freeze({
        assetId: asset.id,
        downloadUrl,
        expiresAt,
      })
    },

    async revokeAccessGrant(command): Promise<FileAssetAccessGrantDto> {
      const actor = await loadUserOrThrow(input.users, command.actorUserId)
      const grant = await loadGrantOrThrow(input.fileAssetAccessGrants, command.grantId)
      const asset = await loadAssetOrThrow(input.fileAssets, grant.assetId)

      if (actor.id !== asset.ownerUserId && actor.id !== grant.grantedByUserId) {
        throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์เพิกถอนสิทธิ์เข้าถึงไฟล์นี้')
      }
      if (grant.revokedAt !== null) {
        throw new InvalidFileAccessStateError('file access grant is already revoked', ['grantId'])
      }

      const reason = normalizeRequiredText(command.reason, 'reason')
      const revokedAt = input.clock.now()
      const revoked = await input.fileAssetAccessGrants.update(
        Object.freeze({
          ...grant,
          revokedAt,
          revokedReason: reason,
          updatedBy: actor.id,
        }),
        command.expectedVersion,
      )

      await recordAudit(input.auditSink, {
        asset,
        details: Object.freeze({
          grantId: revoked.id,
          reason,
        }),
        occurredAt: revokedAt,
        type: 'file.access.grant_revoked',
        userId: actor.id,
      })

      return toFileAssetAccessGrantDto(revoked)
    },
  })
}
