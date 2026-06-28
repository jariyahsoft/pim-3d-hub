import {
  type CreateProposalMilestoneInput,
  type ProposalMilestoneRecord,
  type ProposalMilestoneRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

export function createInMemoryProposalMilestoneRepository(
  clock: ClockPort,
  uuidGenerator: UuidGeneratorPort,
): ProposalMilestoneRepository {
  const milestones = new Map<Uuidv7, ProposalMilestoneRecord>()

  async function create(
    input: CreateProposalMilestoneInput,
  ): Promise<ProposalMilestoneRecord> {
    const now = clock.now()
    const record: ProposalMilestoneRecord = {
      id: input.id ?? uuidGenerator.next(),
      amount: input.amount,
      deliverableDescription: input.deliverableDescription ?? null,
      dueOffsetDays: input.dueOffsetDays ?? null,
      proposalId: input.proposalId,
      sequence: input.sequence,
      title: input.title,
      createdAt: now,
      createdBy: input.createdBy ?? null,
      deletedAt: null,
      updatedAt: now,
      updatedBy: input.updatedBy ?? null,
      version: 1,
      schemaVersion: 1,
    }

    milestones.set(record.id, record)
    return record
  }

  async function findById(id: Uuidv7): Promise<ProposalMilestoneRecord | null> {
    const milestone = milestones.get(id)
    if (!milestone || milestone.deletedAt) {
      return null
    }

    return milestone
  }

  async function listByProposalId(
    proposalId: Uuidv7,
  ): Promise<readonly ProposalMilestoneRecord[]> {
    return Array.from(milestones.values())
      .filter((m) => m.proposalId === proposalId && !m.deletedAt)
      .sort((a, b) => a.sequence - b.sequence)
  }

  return Object.freeze({
    create,
    findById,
    listByProposalId,
  })
}
