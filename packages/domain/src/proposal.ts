import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { MoneyMinor, UtcTimestamp, Uuidv7 } from './index.js'

export const proposalStatuses = [
  'DRAFT',
  'SUBMITTED',
  'REVISED',
  'WITHDRAWN',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
] as const

export type ProposalStatus = (typeof proposalStatuses)[number]
export type ProposalSortField = 'createdAt' | 'updatedAt' | 'submittedAt'

export type ProposalLineItem = Readonly<{
  amount: MoneyMinor
  description: string
  itemType: 'SERVICE' | 'MATERIAL' | 'SHIPPING' | 'OTHER'
  quantity: number
}>

export type ProposalMilestoneRecord = Readonly<
  CanonicalRecord & {
    amount: MoneyMinor
    deliverableDescription: string | null
    dueOffsetDays: number | null
    proposalId: Uuidv7
    sequence: number
    title: string
  }
>

export type CreateProposalMilestoneInput = Readonly<{
  amount: MoneyMinor
  createdBy?: Uuidv7 | null
  deliverableDescription?: string | null
  dueOffsetDays?: number | null
  id?: Uuidv7
  proposalId: Uuidv7
  sequence: number
  title: string
  updatedBy?: Uuidv7 | null
}>

export type ProposalRecord = Readonly<
  CanonicalRecord & {
    currency: string
    exclusions: string | null
    expiresAt: UtcTimestamp | null
    lineItems: readonly ProposalLineItem[]
    milestones: readonly ProposalMilestoneRecord[]
    notes: string | null
    providerProfileId: Uuidv7
    revisionNumber: number
    serviceRequestId: Uuidv7
    status: ProposalStatus
    submittedAt: UtcTimestamp | null
    totalAmount: MoneyMinor
    validUntil: UtcTimestamp | null
  }
>

export type CreateProposalInput = Readonly<{
  createdBy?: Uuidv7 | null
  currency: string
  exclusions?: string | null
  expiresAt?: UtcTimestamp | null
  id?: Uuidv7
  lineItems: readonly ProposalLineItem[]
  notes?: string | null
  providerProfileId: Uuidv7
  revisionNumber?: number
  serviceRequestId: Uuidv7
  status?: ProposalStatus
  submittedAt?: UtcTimestamp | null
  totalAmount: MoneyMinor
  updatedBy?: Uuidv7 | null
  validUntil?: UtcTimestamp | null
}>

export type ProposalFilter = Readonly<{
  providerProfileId?: Uuidv7
  serviceRequestId?: Uuidv7
  status?: ProposalStatus
}>

export type ProposalRepository = Readonly<{
  create(input: CreateProposalInput): Promise<ProposalRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<ProposalRecord | null>
  findLatestByRequestAndProvider(
    serviceRequestId: Uuidv7,
    providerProfileId: Uuidv7,
  ): Promise<ProposalRecord | null>
  list(
    request: RepositoryListRequest<ProposalFilter, ProposalSortField>,
  ): Promise<RepositoryListPage<ProposalRecord>>
  update(
    proposal: ProposalRecord,
    expectedVersion: number,
  ): Promise<ProposalRecord>
}>

export type ProposalMilestoneRepository = Readonly<{
  create(input: CreateProposalMilestoneInput): Promise<ProposalMilestoneRecord>
  findById(id: Uuidv7): Promise<ProposalMilestoneRecord | null>
  listByProposalId(proposalId: Uuidv7): Promise<readonly ProposalMilestoneRecord[]>
}>
