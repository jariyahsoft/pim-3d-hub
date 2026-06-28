import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { MoneyMinor, UtcTimestamp, Uuidv7 } from './index.js'
import type { ProviderServiceType } from './repository.js'

export const serviceRequestStatuses = ['DRAFT', 'PUBLISHED', 'CLOSED'] as const
export const serviceRequestVisibilities = [
  'PUBLIC',
  'INVITE_ONLY',
  'PRIVATE_DIRECT',
  'ORGANIZATION_INTERNAL',
] as const

export type ServiceRequestStatus = (typeof serviceRequestStatuses)[number]
export type ServiceRequestVisibility = (typeof serviceRequestVisibilities)[number]
export type ServiceRequestSortField = 'createdAt' | 'publishedAt' | 'updatedAt'

export type ServiceRequestAttachmentRecord = Readonly<{
  assetId: Uuidv7
  mimeType: string | null
  originalFilename: string | null
  sizeBytes: number | null
}>

export type ServiceRequestStatusHistoryEntry = Readonly<{
  changedAt: UtcTimestamp
  changedBy: Uuidv7 | null
  fromStatus: ServiceRequestStatus | null
  note: string | null
  toStatus: ServiceRequestStatus
}>

export type ServiceRequestRecord = Readonly<
  CanonicalRecord & {
    attachments: readonly ServiceRequestAttachmentRecord[]
    budget: MoneyMinor | null
    buyerUserId: Uuidv7
    category: string | null
    closedAt: UtcTimestamp | null
    description: string | null
    dueAt: UtcTimestamp | null
    objective: string | null
    organizationId: Uuidv7 | null
    prohibitedWorkAcknowledged: boolean
    publishedAt: UtcTimestamp | null
    quantity: number | null
    serviceRegion: string | null
    serviceType: ProviderServiceType | null
    status: ServiceRequestStatus
    statusHistory: readonly ServiceRequestStatusHistoryEntry[]
    title: string | null
    visibility: ServiceRequestVisibility
  }
>

export type CreateServiceRequestInput = Readonly<{
  attachments?: readonly ServiceRequestAttachmentRecord[]
  budget?: MoneyMinor | null
  buyerUserId: Uuidv7
  category?: string | null
  closedAt?: UtcTimestamp | null
  createdBy?: Uuidv7 | null
  description?: string | null
  dueAt?: UtcTimestamp | null
  id?: Uuidv7
  objective?: string | null
  organizationId?: Uuidv7 | null
  prohibitedWorkAcknowledged?: boolean
  publishedAt?: UtcTimestamp | null
  quantity?: number | null
  serviceRegion?: string | null
  serviceType?: ProviderServiceType | null
  status?: ServiceRequestStatus
  statusHistory?: readonly ServiceRequestStatusHistoryEntry[]
  title?: string | null
  updatedBy?: Uuidv7 | null
  visibility?: ServiceRequestVisibility
}>

export type ServiceRequestFilter = Readonly<{
  buyerUserId?: Uuidv7
  dueAtGte?: UtcTimestamp
  dueAtLte?: UtcTimestamp
  organizationId?: Uuidv7 | null
  serviceRegion?: string | null
  serviceType?: ProviderServiceType
  status?: ServiceRequestStatus
  visibility?: ServiceRequestVisibility
}>

export type ServiceRequestRepository = Readonly<{
  create(input: CreateServiceRequestInput): Promise<ServiceRequestRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<ServiceRequestRecord | null>
  list(
    request: RepositoryListRequest<ServiceRequestFilter, ServiceRequestSortField>,
  ): Promise<RepositoryListPage<ServiceRequestRecord>>
  update(
    request: ServiceRequestRecord,
    expectedVersion: number,
  ): Promise<ServiceRequestRecord>
}>
