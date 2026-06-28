import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { UtcTimestamp, Uuidv7 } from './index.js'

export const fileAssetVisibilities = [
  'PRIVATE',
  'ORDER_PARTICIPANTS',
  'ORGANIZATION',
  'PUBLIC_PREVIEW',
] as const
export const fileAssetStatuses = [
  'PENDING_UPLOAD',
  'UPLOADED',
  'QUARANTINED',
  'SCANNING',
  'READY',
  'REJECTED',
  'DELETED',
] as const
export const fileAssetGrantContextTypes = [
  'SERVICE_REQUEST_INVITE',
  'PROPOSAL_REVIEW',
  'ORDER_PARTICIPANT',
  'STAFF_AUDIT',
] as const
export const fileAssetGrantPermissionCodes = ['READ'] as const

export type FileAssetVisibility = (typeof fileAssetVisibilities)[number]
export type FileAssetStatus = (typeof fileAssetStatuses)[number]
export type FileAssetGrantContextType = (typeof fileAssetGrantContextTypes)[number]
export type FileAssetGrantPermissionCode = (typeof fileAssetGrantPermissionCodes)[number]
export type FileAssetSortField = 'createdAt' | 'updatedAt'
export type FileAssetAccessGrantSortField = 'createdAt' | 'expiresAt' | 'updatedAt'

export type FileAssetRecord = Readonly<
  CanonicalRecord & {
    checksumSha256: string | null
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
    visibility: FileAssetVisibility
  }
>

export type CreateFileAssetInput = Readonly<{
  checksumSha256?: string | null
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  mimeType: string
  objectKey: string
  organizationId?: Uuidv7 | null
  originalFilename: string
  ownerUserId: Uuidv7
  purpose: string
  sizeBytes: number
  sourceAssetId?: Uuidv7 | null
  status?: FileAssetStatus
  storageProvider: string
  updatedBy?: Uuidv7 | null
  visibility?: FileAssetVisibility
}>

export type FileAssetFilter = Readonly<{
  organizationId?: Uuidv7 | null
  ownerUserId?: Uuidv7
  sourceAssetId?: Uuidv7 | null
  status?: FileAssetStatus
  visibility?: FileAssetVisibility
}>

export type FileAssetRepository = Readonly<{
  create(input: CreateFileAssetInput): Promise<FileAssetRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<FileAssetRecord | null>
  list(
    request: RepositoryListRequest<FileAssetFilter, FileAssetSortField>,
  ): Promise<RepositoryListPage<FileAssetRecord>>
  update(asset: FileAssetRecord, expectedVersion: number): Promise<FileAssetRecord>
}>

export type FileAssetAccessGrantRecord = Readonly<
  CanonicalRecord & {
    assetId: Uuidv7
    contextId: Uuidv7
    contextType: FileAssetGrantContextType
    expiresAt: UtcTimestamp
    grantedByUserId: Uuidv7
    granteeUserId: Uuidv7
    permissionCode: FileAssetGrantPermissionCode
    revokedAt: UtcTimestamp | null
    revokedReason: string | null
  }
>

export type CreateFileAssetAccessGrantInput = Readonly<{
  assetId: Uuidv7
  contextId: Uuidv7
  contextType: FileAssetGrantContextType
  createdBy?: Uuidv7 | null
  expiresAt: UtcTimestamp
  grantedByUserId: Uuidv7
  granteeUserId: Uuidv7
  id?: Uuidv7
  permissionCode?: FileAssetGrantPermissionCode
  revokedAt?: UtcTimestamp | null
  revokedReason?: string | null
  updatedBy?: Uuidv7 | null
}>

export type FileAssetAccessGrantFilter = Readonly<{
  activeAt?: UtcTimestamp
  assetId?: Uuidv7
  contextId?: Uuidv7
  contextType?: FileAssetGrantContextType
  granteeUserId?: Uuidv7
  grantedByUserId?: Uuidv7
}>

export type FileAssetAccessGrantRepository = Readonly<{
  create(input: CreateFileAssetAccessGrantInput): Promise<FileAssetAccessGrantRecord>
  findById(id: Uuidv7): Promise<FileAssetAccessGrantRecord | null>
  list(
    request: RepositoryListRequest<FileAssetAccessGrantFilter, FileAssetAccessGrantSortField>,
  ): Promise<RepositoryListPage<FileAssetAccessGrantRecord>>
  update(
    grant: FileAssetAccessGrantRecord,
    expectedVersion: number,
  ): Promise<FileAssetAccessGrantRecord>
}>
