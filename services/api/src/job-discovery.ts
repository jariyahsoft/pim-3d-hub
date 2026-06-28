import type {
  DiscoverJobsQuery,
  GetJobDetailQuery,
  JobDiscoveryItemDto,
  JobDiscoveryService,
} from '@pim/application'
import type { RequestContext } from '@pim/application'
import {
  discoverJobsQuerySchema,
  jobDiscoveryDetailResponseSchema,
  jobDiscoveryListResponseSchema,
} from '@pim/contracts'
import type { UtcTimestamp, Uuidv7 } from '@pim/domain'

type JobDiscoveryListPage = Readonly<{
  items: readonly JobDiscoveryItemDto[]
  nextCursor: string | null
}>

export function createJobDiscoveryController(
  service: JobDiscoveryService,
): JobDiscoveryController {
  async function discoverJobs(
    ctx: RequestContext,
    query: unknown,
  ): Promise<{ status: 200; body: JobDiscoveryListPage }> {
    const parsed = discoverJobsQuerySchema.parse(query)

    const discoverQuery: DiscoverJobsQuery = {
      actorUserId: ctx.userId as Uuidv7,
      category: parsed.category ?? undefined,
      cursor: parsed.cursor ?? undefined,
      dueAtGte: (parsed.dueAtGte as UtcTimestamp | undefined) ?? undefined,
      dueAtLte: (parsed.dueAtLte as UtcTimestamp | undefined) ?? undefined,
      limit: parsed.limit ?? undefined,
      serviceRegion: parsed.serviceRegion ?? undefined,
      serviceType: (parsed.serviceType as any) ?? undefined,
      sortDirection: parsed.sortDirection ?? undefined,
      sortField: (parsed.sortField as any) ?? undefined,
    }

    const result = await service.discoverJobs(discoverQuery)

    return {
      status: 200,
      body: result,
    }
  }

  async function getJobDetail(
    ctx: RequestContext,
    jobId: string,
  ): Promise<{ status: 200; body: JobDiscoveryItemDto }> {
    if (!jobId) {
      throw new Error('Job ID is required')
    }

    const query: GetJobDetailQuery = {
      actorUserId: ctx.userId as Uuidv7,
      jobId: jobId as Uuidv7,
    }

    const result = await service.getJobDetail(query)

    return {
      status: 200,
      body: result,
    }
  }

  return Object.freeze({
    discoverJobs,
    getJobDetail,
  })
}

export type JobDiscoveryController = Readonly<{
  discoverJobs(
    ctx: RequestContext,
    query: unknown,
  ): Promise<{ status: 200; body: JobDiscoveryListPage }>
  getJobDetail(
    ctx: RequestContext,
    jobId: string,
  ): Promise<{ status: 200; body: JobDiscoveryItemDto }>
}>
