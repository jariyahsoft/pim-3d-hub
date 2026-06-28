import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { MoneyMinor, UtcTimestamp, Uuidv7 } from './index.js'

// Report types
export const reportTargetTypes = [
  'USER',
  'POST',
  'COMMENT',
  'MESSAGE',
  'REVIEW',
  'PRODUCT',
] as const
export const reportReasons = [
  'SPAM',
  'HARASSMENT',
  'INAPPROPRIATE_CONTENT',
  'FRAUD',
  'COPYRIGHT_VIOLATION',
  'IMPERSONATION',
  'OTHER',
] as const
export const reportStatuses = ['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'] as const

export type ReportTargetType = (typeof reportTargetTypes)[number]
export type ReportReason = (typeof reportReasons)[number]
export type ReportStatus = (typeof reportStatuses)[number]
export type ReportSortField = 'createdAt' | 'updatedAt'

// Moderation types
export const moderationActionTypes = ['HIDE', 'REMOVE', 'SUSPEND', 'WARN', 'NONE'] as const
export const moderationCaseStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'] as const

export type ModerationActionType = (typeof moderationActionTypes)[number]
export type ModerationCaseStatus = (typeof moderationCaseStatuses)[number]
export type ModerationCaseSortField = 'createdAt' | 'updatedAt' | 'priority'

// Dispute types
export const disputeCategories = [
  'ITEM_NOT_RECEIVED',
  'ITEM_DAMAGED',
  'NOT_AS_DESCRIBED',
  'WRONG_ITEM',
  'QUALITY_ISSUE',
  'OTHER',
] as const
export const disputeStatuses = [
  'OPEN',
  'AWAITING_BUYER_RESPONSE',
  'AWAITING_SELLER_RESPONSE',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
] as const
export const disputeResolutionTypes = ['REFUND_FULL', 'REFUND_PARTIAL', 'REPRINT', 'NONE'] as const

export type DisputeCategory = (typeof disputeCategories)[number]
export type DisputeStatus = (typeof disputeStatuses)[number]
export type DisputeResolutionType = (typeof disputeResolutionTypes)[number]
export type DisputeSortField = 'createdAt' | 'updatedAt' | 'deadline'

// Report Record
export type ReportRecord = Readonly<
  CanonicalRecord & {
    reporterUserId: Uuidv7
    targetType: ReportTargetType
    targetId: Uuidv7
    reason: ReportReason
    description: string
    status: ReportStatus
    assignedModeratorId: Uuidv7 | null
    moderationCaseId: Uuidv7 | null
    resolvedAt: UtcTimestamp | null
    resolvedBy: Uuidv7 | null
    resolutionNotes: string | null
  }
>

export type CreateReportInput = Readonly<{
  createdBy?: Uuidv7 | null
  description: string
  id?: Uuidv7
  reason: ReportReason
  reporterUserId: Uuidv7
  targetId: Uuidv7
  targetType: ReportTargetType
  updatedBy?: Uuidv7 | null
}>

export type ReportFilter = Readonly<{
  reporterUserId?: Uuidv7
  status?: ReportStatus
  targetId?: Uuidv7
  targetType?: ReportTargetType
}>

export interface ReportRepository {
  create(input: CreateReportInput): Promise<ReportRecord>
  findById(id: Uuidv7): Promise<ReportRecord | null>
  list(
    request: RepositoryListRequest<ReportFilter, ReportSortField>,
  ): Promise<RepositoryListPage<ReportRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        ReportRecord,
        | 'assignedModeratorId'
        | 'moderationCaseId'
        | 'resolvedAt'
        | 'resolvedBy'
        | 'resolutionNotes'
        | 'status'
      >
    >,
  ): Promise<ReportRecord>
}

// Moderation Case Record
export type ModerationCaseRecord = Readonly<
  CanonicalRecord & {
    targetType: ReportTargetType
    targetId: Uuidv7
    status: ModerationCaseStatus
    assignedModeratorId: Uuidv7 | null
    priority: number
    actionTaken: ModerationActionType | null
    actionDuration: number | null
    actionReason: string | null
    actionedAt: UtcTimestamp | null
    actionedBy: Uuidv7 | null
    reportIds: Uuidv7[]
    evidenceSnapshot: Record<string, unknown>
  }
>

export type CreateModerationCaseInput = Readonly<{
  assignedModeratorId?: Uuidv7 | null
  createdBy?: Uuidv7 | null
  evidenceSnapshot?: Record<string, unknown>
  id?: Uuidv7
  priority?: number
  reportIds?: Uuidv7[]
  targetId: Uuidv7
  targetType: ReportTargetType
  updatedBy?: Uuidv7 | null
}>

export type ModerationCaseFilter = Readonly<{
  assignedModeratorId?: Uuidv7
  status?: ModerationCaseStatus
  targetId?: Uuidv7
  targetType?: ReportTargetType
}>

export interface ModerationCaseRepository {
  create(input: CreateModerationCaseInput): Promise<ModerationCaseRecord>
  findById(id: Uuidv7): Promise<ModerationCaseRecord | null>
  findByTarget(targetType: ReportTargetType, targetId: Uuidv7): Promise<ModerationCaseRecord | null>
  list(
    request: RepositoryListRequest<ModerationCaseFilter, ModerationCaseSortField>,
  ): Promise<RepositoryListPage<ModerationCaseRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        ModerationCaseRecord,
        | 'actionDuration'
        | 'actionReason'
        | 'actionTaken'
        | 'actionedAt'
        | 'actionedBy'
        | 'assignedModeratorId'
        | 'priority'
        | 'reportIds'
        | 'status'
      >
    >,
  ): Promise<ModerationCaseRecord>
}

// Dispute Record
export type DisputeRecord = Readonly<
  CanonicalRecord & {
    orderId: Uuidv7
    buyerUserId: Uuidv7
    providerUserId: Uuidv7
    category: DisputeCategory
    requestedResolution: DisputeResolutionType
    description: string
    status: DisputeStatus
    payoutHoldApplied: boolean
    payoutHoldAmount: MoneyMinor | null
    deadline: UtcTimestamp
    buyerEvidenceUrls: string[]
    sellerResponseText: string | null
    sellerEvidenceUrls: string[]
    sellerRespondedAt: UtcTimestamp | null
    reviewedByModeratorId: Uuidv7 | null
    resolutionType: DisputeResolutionType | null
    resolutionAmount: MoneyMinor | null
    resolvedAt: UtcTimestamp | null
    resolvedBy: Uuidv7 | null
    resolutionNotes: string | null
  }
>

export type CreateDisputeInput = Readonly<{
  buyerEvidenceUrls?: string[]
  buyerUserId: Uuidv7
  category: DisputeCategory
  createdBy?: Uuidv7 | null
  deadline: UtcTimestamp
  description: string
  id?: Uuidv7
  orderId: Uuidv7
  providerUserId: Uuidv7
  requestedResolution: DisputeResolutionType
  updatedBy?: Uuidv7 | null
}>

export type DisputeFilter = Readonly<{
  buyerUserId?: Uuidv7
  orderId?: Uuidv7
  providerUserId?: Uuidv7
  status?: DisputeStatus
}>

export interface DisputeRepository {
  create(input: CreateDisputeInput): Promise<DisputeRecord>
  findById(id: Uuidv7): Promise<DisputeRecord | null>
  findByOrderId(orderId: Uuidv7): Promise<DisputeRecord | null>
  list(
    request: RepositoryListRequest<DisputeFilter, DisputeSortField>,
  ): Promise<RepositoryListPage<DisputeRecord>>
  update(
    id: Uuidv7,
    expectedVersion: number,
    input: Partial<
      Pick<
        DisputeRecord,
        | 'deadline'
        | 'payoutHoldAmount'
        | 'payoutHoldApplied'
        | 'resolutionAmount'
        | 'resolutionNotes'
        | 'resolutionType'
        | 'resolvedAt'
        | 'resolvedBy'
        | 'reviewedByModeratorId'
        | 'sellerEvidenceUrls'
        | 'sellerRespondedAt'
        | 'sellerResponseText'
        | 'status'
      >
    >,
  ): Promise<DisputeRecord>
}
