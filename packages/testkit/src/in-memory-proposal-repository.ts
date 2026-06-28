import {
  RepositoryConflictError,
  type CreateProposalInput,
  type ProposalFilter,
  type ProposalRecord,
  type ProposalRepository,
  type ProposalSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

export function createInMemoryProposalRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): ProposalRepository {
  const proposals = new Map<Uuidv7, ProposalRecord>()

  async function create(input: CreateProposalInput): Promise<ProposalRecord> {
    const now = clock.now()
    const record: ProposalRecord = {
      id: input.id ?? uuidGenerator.next(),
      currency: input.currency,
      exclusions: input.exclusions ?? null,
      expiresAt: input.expiresAt ?? null,
      lineItems: input.lineItems,
      milestones: [],
      notes: input.notes ?? null,
      providerProfileId: input.providerProfileId,
      revisionNumber: input.revisionNumber ?? 1,
      serviceRequestId: input.serviceRequestId,
      status: input.status ?? 'DRAFT',
      submittedAt: input.submittedAt ?? null,
      totalAmount: input.totalAmount,
      validUntil: input.validUntil ?? null,
      createdAt: now,
      createdBy: input.createdBy ?? null,
      deletedAt: null,
      updatedAt: now,
      updatedBy: input.updatedBy ?? null,
      version: 1,
      schemaVersion: 1,
    }

    proposals.set(record.id, record)
    return record
  }

  async function findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<ProposalRecord | null> {
    const proposal = proposals.get(id)
    if (!proposal) {
      return null
    }

    if (proposal.deletedAt && !options?.includeDeleted) {
      return null
    }

    return proposal
  }

  async function findLatestByRequestAndProvider(
    serviceRequestId: Uuidv7,
    providerProfileId: Uuidv7,
  ): Promise<ProposalRecord | null> {
    const matching = Array.from(proposals.values())
      .filter(
        (p) =>
          p.serviceRequestId === serviceRequestId &&
          p.providerProfileId === providerProfileId &&
          !p.deletedAt,
      )
      .sort((a, b) => b.revisionNumber - a.revisionNumber)

    return matching[0] ?? null
  }

  async function list(
    request: RepositoryListRequest<ProposalFilter, ProposalSortField>,
  ): Promise<RepositoryListPage<ProposalRecord>> {
    const { cursor: cursorInput, filter = {}, limit, sort } = request
    const sortDirection = sort.direction
    const sortField = sort.field

    let items = Array.from(proposals.values()).filter((p) => !p.deletedAt)

    // Apply filters
    if (filter.providerProfileId) {
      items = items.filter((p) => p.providerProfileId === filter.providerProfileId)
    }

    if (filter.serviceRequestId) {
      items = items.filter((p) => p.serviceRequestId === filter.serviceRequestId)
    }

    if (filter.status) {
      items = items.filter((p) => p.status === filter.status)
    }

    // Sort
    items.sort((a, b) => {
      const aValue = a[sortField] as UtcTimestamp
      const bValue = b[sortField] as UtcTimestamp

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      }
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    })

    // Apply cursor
    if (cursorInput) {
      const cursorIndex = items.findIndex((p) => p.id === cursorInput)
      if (cursorIndex !== -1) {
        items = items.slice(cursorIndex + 1)
      }
    }

    // Paginate
    const page = items.slice(0, limit)
    const hasMore = items.length > limit
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1]!.id : null

    return {
      items: page,
      nextCursor,
    }
  }

  async function update(
    proposal: ProposalRecord,
    expectedVersion: number,
  ): Promise<ProposalRecord> {
    const existing = proposals.get(proposal.id)
    if (!existing) {
      throw new RepositoryConflictError({
        entityName: 'Proposal',
        entityId: proposal.id,
        expectedVersion,
        actualVersion: 0,
      })
    }

    if (existing.version !== expectedVersion) {
      throw new RepositoryConflictError({
        entityName: 'Proposal',
        entityId: proposal.id,
        expectedVersion,
        actualVersion: existing.version,
      })
    }

    const updated: ProposalRecord = {
      ...proposal,
      updatedAt: clock.now(),
      version: existing.version + 1,
    }

    proposals.set(updated.id, updated)
    return updated
  }

  return Object.freeze({
    create,
    findById,
    findLatestByRequestAndProvider,
    list,
    update,
  })
}
