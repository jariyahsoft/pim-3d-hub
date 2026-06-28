import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { MoneyMinor, UtcTimestamp, Uuidv7 } from './index.js'
import type { ProviderServiceType } from './repository.js'
import type {
  ServiceRequestStatus,
  ServiceRequestVisibility,
} from './service-request.js'

export type JobDiscoverySortField = 'publishedAt' | 'dueAt' | 'updatedAt'

export type JobDiscoveryItemRecord = Readonly<
  CanonicalRecord & {
    budget: MoneyMinor | null
    buyerUserId: Uuidv7
    category: string | null
    dueAt: UtcTimestamp | null
    hasPrivateAssets: boolean
    organizationId: Uuidv7 | null
    publishedAt: UtcTimestamp | null
    quantity: number | null
    serviceRegion: string | null
    serviceRequestId: Uuidv7
    serviceType: ProviderServiceType | null
    status: ServiceRequestStatus
    title: string | null
    visibility: ServiceRequestVisibility
  }
>

export type JobDiscoveryFilter = Readonly<{
  category?: string
  dueAtGte?: UtcTimestamp
  dueAtLte?: UtcTimestamp
  organizationId?: Uuidv7 | null
  serviceRegion?: string | null
  serviceType?: ProviderServiceType
  status?: ServiceRequestStatus
  visibility?: ServiceRequestVisibility
}>

export type JobDiscoveryQueryRepository = Readonly<{
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<JobDiscoveryItemRecord | null>
  list(
    request: RepositoryListRequest<JobDiscoveryFilter, JobDiscoverySortField>,
  ): Promise<RepositoryListPage<JobDiscoveryItemRecord>>
}>
