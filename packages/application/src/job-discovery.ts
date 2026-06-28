import {
  AuthorizationDeniedError,
  type ClockPort,
} from './identity.js'
import {
  type FileAssetAccessGrantRepository,
  type JobDiscoveryFilter,
  type JobDiscoveryItemRecord,
  type JobDiscoveryQueryRepository,
  type JobDiscoverySortField,
  type MoneyMinor,
  type ProviderProfileRecord as _ProviderProfileRecord,
  type ProviderProfileRepository,
  type ProviderServiceType,
  type SortDirection,
  type ServiceRequestStatus,
  type ServiceRequestVisibility,
  type UserRecord as _UserRecord,
  type UserRoleRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type JobDiscoveryItemDto = Readonly<{
  budget: MoneyMinor | null
  category: string | null
  dueAt: UtcTimestamp | null
  hasPrivateAssets: boolean
  id: Uuidv7
  publishedAt: UtcTimestamp | null
  quantity: number | null
  serviceRegion: string | null
  serviceType: ProviderServiceType | null
  status: ServiceRequestStatus
  title: string | null
  visibility: ServiceRequestVisibility
}>

export class JobDiscoveryNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'JobDiscoveryNotFoundError'
  }
}

export type DiscoverJobsQuery = Readonly<{
  actorUserId: Uuidv7
  category?: string | undefined
  cursor?: string | undefined
  dueAtGte?: UtcTimestamp | undefined
  dueAtLte?: UtcTimestamp | undefined
  limit?: number | undefined
  serviceRegion?: string | null | undefined
  serviceType?: ProviderServiceType | undefined
  sortDirection?: SortDirection | undefined
  sortField?: JobDiscoverySortField | undefined
}>

export type GetJobDetailQuery = Readonly<{
  actorUserId: Uuidv7
  jobId: Uuidv7
}>

export type JobDiscoveryServicePorts = Readonly<{
  clock: ClockPort
  grantRepository: FileAssetAccessGrantRepository
  jobDiscoveryRepository: JobDiscoveryQueryRepository
  providerProfileRepository: ProviderProfileRepository
  userRoleRepository: UserRoleRepository
}>

type RepositoryListPage<T> = Readonly<{
  items: readonly T[]
  nextCursor: string | null
}>

export function createJobDiscoveryService(ports: JobDiscoveryServicePorts) {
  const {
    clock: _clock,
    grantRepository: _grantRepository,
    jobDiscoveryRepository,
    providerProfileRepository: _providerProfileRepository,
    userRoleRepository,
  } = ports

  async function canViewJob(
    actorUserId: Uuidv7,
    job: JobDiscoveryItemRecord,
  ): Promise<boolean> {
    // Owner can always view
    if (job.buyerUserId === actorUserId) {
      return true
    }

    // PUBLIC jobs are visible to all authenticated providers
    if (job.visibility === 'PUBLIC' && job.status === 'PUBLISHED') {
      const providerRoles = ['DESIGN_PROVIDER', 'PRINT_PROVIDER', 'FULL_SERVICE_PROVIDER'] as const

      for (const roleCode of providerRoles) {
        const roles = await userRoleRepository.findByUserRoleScope(
          actorUserId,
          roleCode,
          'GLOBAL',
          null,
        )
        if (roles && Array.isArray(roles) && roles.some((r) => r.status === 'ACTIVE')) {
          return true
        }
      }
      return false
    }

    // INVITE_ONLY requires explicit grant
    if (job.visibility === 'INVITE_ONLY') {
      // For INVITE_ONLY jobs, only the owner can view without a grant
      // Providers need an explicit access grant which is out of scope for basic discovery
      return false
    }

    // PRIVATE_DIRECT and ORGANIZATION_INTERNAL are not discoverable
    return false
  }

  async function discoverJobs(
    query: DiscoverJobsQuery,
  ): Promise<RepositoryListPage<JobDiscoveryItemDto>> {
    const {
      actorUserId,
      category,
      cursor,
      dueAtGte,
      dueAtLte,
      limit = 20,
      serviceRegion,
      serviceType,
      sortDirection = 'desc',
      sortField = 'publishedAt',
    } = query

    // Verify actor has active provider role
    const providerRoles = ['DESIGN_PROVIDER', 'PRINT_PROVIDER', 'FULL_SERVICE_PROVIDER'] as const
    let hasActiveProviderRole = false

    for (const roleCode of providerRoles) {
      const roles = await userRoleRepository.findByUserRoleScope(
        actorUserId,
        roleCode,
        'GLOBAL',
        null,
      )
      if (roles && Array.isArray(roles) && roles.some((r) => r.status === 'ACTIVE')) {
        hasActiveProviderRole = true
        break
      }
    }

    if (!hasActiveProviderRole) {
      throw new AuthorizationDeniedError(
        'Only active providers can discover jobs',
      )
    }

    const filter: JobDiscoveryFilter = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      ...(category && { category }),
      ...(dueAtGte && { dueAtGte }),
      ...(dueAtLte && { dueAtLte }),
      ...(serviceRegion !== undefined && { serviceRegion }),
      ...(serviceType && { serviceType }),
    }

    const page = await jobDiscoveryRepository.list({
      ...(cursor && { cursor }),
      filter,
      limit,
      sort: {
        direction: sortDirection,
        field: sortField,
      },
    })

    const items: JobDiscoveryItemDto[] = page.items.map((item) => ({
      budget: item.budget,
      category: item.category,
      dueAt: item.dueAt,
      hasPrivateAssets: item.hasPrivateAssets,
      id: item.serviceRequestId,
      publishedAt: item.publishedAt,
      quantity: item.quantity,
      serviceRegion: item.serviceRegion ?? null,
      serviceType: item.serviceType,
      status: item.status,
      title: item.title,
      visibility: item.visibility,
    }))

    return {
      items,
      nextCursor: page.nextCursor,
    }
  }

  async function getJobDetail(
    query: GetJobDetailQuery,
  ): Promise<JobDiscoveryItemDto> {
    const { actorUserId, jobId } = query

    const job = await jobDiscoveryRepository.findById(jobId)

    if (!job) {
      throw new JobDiscoveryNotFoundError(
        `Job ${jobId} not found`,
      )
    }

    if (job.deletedAt !== null) {
      throw new JobDiscoveryNotFoundError(
        `Job ${jobId} not found`,
      )
    }

    const canView = await canViewJob(actorUserId, job)

    if (!canView) {
      throw new AuthorizationDeniedError(
        'You do not have permission to view this job',
      )
    }

    return {
      budget: job.budget,
      category: job.category,
      dueAt: job.dueAt,
      hasPrivateAssets: job.hasPrivateAssets,
      id: job.serviceRequestId,
      publishedAt: job.publishedAt,
      quantity: job.quantity,
      serviceRegion: job.serviceRegion ?? null,
      serviceType: job.serviceType,
      status: job.status,
      title: job.title,
      visibility: job.visibility,
    }
  }

  return Object.freeze({
    discoverJobs,
    getJobDetail,
  })
}

export type JobDiscoveryService = ReturnType<typeof createJobDiscoveryService>
