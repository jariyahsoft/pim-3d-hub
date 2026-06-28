import type { CanonicalRecord, RepositoryListPage, RepositoryListRequest } from './repository.js'
import type { UtcTimestamp, Uuidv7 } from './index.js'

export type ProviderTrustProjectionSortField = 'createdAt' | 'updatedAt'

export type ProviderCompletedJobFact = Readonly<{
  completedAt: UtcTimestamp
  dueAt: UtcTimestamp | null
  orderId: Uuidv7
  ratingScore: number | null
}>

export type ProviderTrustProjectionRecord = Readonly<
  CanonicalRecord & {
    completedJobsCount: number
    lowSampleSize: boolean
    onTimeJobsCount: number
    providerProfileId: Uuidv7
    ratingAverage: number | null
    ratingCount: number
    sponsored: boolean
  }
>

export type CreateProviderTrustProjectionInput = Readonly<{
  completedJobsCount: number
  createdBy?: Uuidv7 | null
  id?: Uuidv7
  lowSampleSize: boolean
  onTimeJobsCount: number
  providerProfileId: Uuidv7
  ratingAverage: number | null
  ratingCount: number
  sponsored?: boolean
  updatedBy?: Uuidv7 | null
}>

export type ProviderTrustProjectionFilter = Readonly<{
  providerProfileId?: Uuidv7
  sponsored?: boolean
}>

export type ProviderTrustProjectionRepository = Readonly<{
  create(input: CreateProviderTrustProjectionInput): Promise<ProviderTrustProjectionRecord>
  findById(id: Uuidv7): Promise<ProviderTrustProjectionRecord | null>
  findByProviderProfileId(providerProfileId: Uuidv7): Promise<ProviderTrustProjectionRecord | null>
  list(
    request: RepositoryListRequest<
      ProviderTrustProjectionFilter,
      ProviderTrustProjectionSortField
    >,
  ): Promise<RepositoryListPage<ProviderTrustProjectionRecord>>
  update(
    projection: ProviderTrustProjectionRecord,
    expectedVersion: number,
  ): Promise<ProviderTrustProjectionRecord>
}>
