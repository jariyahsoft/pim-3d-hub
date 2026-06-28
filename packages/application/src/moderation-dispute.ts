import type {
  CreateDisputeInput,
  CreateModerationCaseInput,
  CreateReportInput,
  DisputeCategory,
  DisputeRecord,
  DisputeRepository,
  DisputeResolutionType,
  DisputeStatus,
  ModerationActionType,
  ModerationCaseRecord,
  ModerationCaseRepository,
  ModerationCaseStatus,
  MoneyMinor,
  OrderRecord,
  OrderRepository,
  ReportReason,
  ReportRecord,
  ReportRepository,
  ReportStatus,
  ReportTargetType,
  UtcTimestamp,
  Uuidv7,
} from '@pim/domain'
import { AuthorizationDeniedError, InvalidRequestError } from './errors.js'

export class DisputeNotFoundError extends Error {
  constructor(disputeId: Uuidv7) {
    super(`Dispute ${disputeId} not found`)
    this.name = 'DisputeNotFoundError'
  }
}

export class DisputeEligibilityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DisputeEligibilityError'
  }
}

export type DisputeDto = Readonly<{
  buyerEvidenceUrls: string[]
  buyerUserId: Uuidv7
  category: DisputeCategory
  createdAt: UtcTimestamp
  deadline: UtcTimestamp
  description: string
  id: Uuidv7
  orderId: Uuidv7
  payoutHoldAmount: MoneyMinor | null
  payoutHoldApplied: boolean
  providerUserId: Uuidv7
  requestedResolution: DisputeResolutionType
  resolutionAmount: MoneyMinor | null
  resolutionNotes: string | null
  resolutionType: DisputeResolutionType | null
  resolvedAt: UtcTimestamp | null
  reviewedByModeratorId: Uuidv7 | null
  sellerEvidenceUrls: string[]
  sellerRespondedAt: UtcTimestamp | null
  sellerResponseText: string | null
  status: DisputeStatus
  updatedAt: UtcTimestamp
  version: number
}>

export type ReportDto = Readonly<{
  assignedModeratorId: Uuidv7 | null
  createdAt: UtcTimestamp
  description: string
  id: Uuidv7
  moderationCaseId: Uuidv7 | null
  reason: ReportReason
  reporterUserId: Uuidv7
  resolvedAt: UtcTimestamp | null
  resolutionNotes: string | null
  status: ReportStatus
  targetId: Uuidv7
  targetType: ReportTargetType
  updatedAt: UtcTimestamp
  version: number
}>

export type ModerationCaseDto = Readonly<{
  actionDuration: number | null
  actionReason: string | null
  actionTaken: ModerationActionType | null
  actionedAt: UtcTimestamp | null
  assignedModeratorId: Uuidv7 | null
  createdAt: UtcTimestamp
  evidenceSnapshot: Record<string, unknown>
  id: Uuidv7
  priority: number
  reportIds: Uuidv7[]
  status: ModerationCaseStatus
  targetId: Uuidv7
  targetType: ReportTargetType
  updatedAt: UtcTimestamp
  version: number
}>

export function createModerationDisputeService(deps: {
  disputeRepository: DisputeRepository
  moderationCaseRepository: ModerationCaseRepository
  now: () => Date
  orderRepository: OrderRepository
  reportRepository: ReportRepository
}) {
  const { disputeRepository, moderationCaseRepository, now, orderRepository, reportRepository } =
    deps

  async function createReport(
    actorUserId: Uuidv7,
    input: Readonly<{
      description: string
      reason: ReportReason
      targetId: Uuidv7
      targetType: ReportTargetType
    }>,
  ): Promise<ReportDto> {
    // Validate description length
    if (input.description.length > 2000) {
      throw new InvalidRequestError('Report description must not exceed 2000 characters')
    }

    if (input.description.length < 10) {
      throw new InvalidRequestError('Report description must be at least 10 characters')
    }

    // Create report
    const report = await reportRepository.create({
      createdBy: actorUserId,
      description: input.description,
      reason: input.reason,
      reporterUserId: actorUserId,
      targetId: input.targetId,
      targetType: input.targetType,
      updatedBy: actorUserId,
    })

    return toReportDto(report)
  }

  async function createModerationCase(
    actorUserId: Uuidv7,
    input: Readonly<{
      assignedModeratorId?: Uuidv7
      evidenceSnapshot?: Record<string, unknown>
      priority?: number
      reportIds?: Uuidv7[]
      targetId: Uuidv7
      targetType: ReportTargetType
    }>,
  ): Promise<ModerationCaseDto> {
    // Check for existing case
    const existing = await moderationCaseRepository.findByTarget(input.targetType, input.targetId)
    if (existing && existing.status !== 'RESOLVED') {
      throw new InvalidRequestError('Moderation case already exists for this target')
    }

    const moderationCase = await moderationCaseRepository.create({
      assignedModeratorId: input.assignedModeratorId,
      createdBy: actorUserId,
      evidenceSnapshot: input.evidenceSnapshot ?? {},
      priority: input.priority ?? 1,
      reportIds: input.reportIds ?? [],
      targetId: input.targetId,
      targetType: input.targetType,
      updatedBy: actorUserId,
    })

    // Update associated reports
    if (input.reportIds) {
      for (const reportId of input.reportIds) {
        const report = await reportRepository.findById(reportId)
        if (report) {
          await reportRepository.update(reportId, report.version, {
            moderationCaseId: moderationCase.id,
            status: 'REVIEWING',
          })
        }
      }
    }

    return toModerationCaseDto(moderationCase)
  }

  async function takeModerationAction(
    actorUserId: Uuidv7,
    caseId: Uuidv7,
    input: Readonly<{
      actionDuration?: number
      actionReason: string
      actionType: ModerationActionType
    }>,
  ): Promise<ModerationCaseDto> {
    const moderationCase = await moderationCaseRepository.findById(caseId)
    if (!moderationCase) {
      throw new Error(`Moderation case ${caseId} not found`)
    }

    // Validate action reason
    if (input.actionReason.length < 10) {
      throw new InvalidRequestError('Action reason must be at least 10 characters')
    }

    if (input.actionReason.length > 1000) {
      throw new InvalidRequestError('Action reason must not exceed 1000 characters')
    }

    // Validate duration for time-limited actions
    if (
      input.actionType !== 'NONE' &&
      input.actionType !== 'WARN' &&
      input.actionDuration &&
      input.actionDuration <= 0
    ) {
      throw new InvalidRequestError('Action duration must be positive')
    }

    const updated = await moderationCaseRepository.update(caseId, moderationCase.version, {
      actionDuration: input.actionDuration ?? null,
      actionReason: input.actionReason,
      actionTaken: input.actionType,
      actionedAt: now().toISOString() as UtcTimestamp,
      actionedBy: actorUserId,
      status: 'RESOLVED',
    })

    // Update associated reports
    for (const reportId of moderationCase.reportIds) {
      const report = await reportRepository.findById(reportId)
      if (report) {
        await reportRepository.update(reportId, report.version, {
          resolvedAt: now().toISOString() as UtcTimestamp,
          resolvedBy: actorUserId,
          status: 'RESOLVED',
        })
      }
    }

    return toModerationCaseDto(updated)
  }

  async function createDispute(
    actorUserId: Uuidv7,
    input: Readonly<{
      buyerEvidenceUrls?: string[]
      category: DisputeCategory
      description: string
      orderId: Uuidv7
      requestedResolution: DisputeResolutionType
    }>,
  ): Promise<DisputeDto> {
    // Load order
    const order = await orderRepository.findById(input.orderId)
    if (!order) {
      throw new DisputeEligibilityError('Order not found')
    }

    // Only buyer can create dispute
    if (order.buyerUserId !== actorUserId) {
      throw new AuthorizationDeniedError('Only the order buyer can create a dispute')
    }

    // Check order status eligibility
    const eligibleStatuses = ['SHIPPED', 'DELIVERED', 'COMPLETED']
    if (!eligibleStatuses.includes(order.status)) {
      throw new DisputeEligibilityError(
        'Disputes can only be opened for shipped, delivered, or completed orders',
      )
    }

    // Check for duplicate dispute
    const existing = await disputeRepository.findByOrderId(input.orderId)
    if (existing) {
      throw new InvalidRequestError('A dispute already exists for this order')
    }

    // Validate description
    if (input.description.length < 20) {
      throw new InvalidRequestError('Dispute description must be at least 20 characters')
    }

    if (input.description.length > 5000) {
      throw new InvalidRequestError('Dispute description must not exceed 5000 characters')
    }

    // Validate evidence URLs
    if (input.buyerEvidenceUrls && input.buyerEvidenceUrls.length > 10) {
      throw new InvalidRequestError('Maximum 10 evidence URLs allowed')
    }

    // Calculate deadline (14 days from now)
    const deadline = new Date(now())
    deadline.setDate(deadline.getDate() + 14)

    // Create dispute with payout hold
    const dispute = await disputeRepository.create({
      buyerEvidenceUrls: input.buyerEvidenceUrls ?? [],
      buyerUserId: order.buyerUserId,
      category: input.category,
      createdBy: actorUserId,
      deadline: deadline.toISOString() as UtcTimestamp,
      description: input.description,
      orderId: input.orderId,
      providerUserId: order.providerProfileId,
      requestedResolution: input.requestedResolution,
      updatedBy: actorUserId,
    })

    // Apply payout hold (this would integrate with payment/payout system)
    await disputeRepository.update(dispute.id, dispute.version, {
      payoutHoldAmount: order.totalAmount,
      payoutHoldApplied: true,
    })

    return toDisputeDto(await disputeRepository.findById(dispute.id)!)
  }

  async function addSellerResponse(
    actorUserId: Uuidv7,
    disputeId: Uuidv7,
    input: Readonly<{
      responseText: string
      sellerEvidenceUrls?: string[]
    }>,
  ): Promise<DisputeDto> {
    const dispute = await disputeRepository.findById(disputeId)
    if (!dispute) {
      throw new DisputeNotFoundError(disputeId)
    }

    // Verify actor is provider
    if (dispute.providerUserId !== actorUserId) {
      throw new AuthorizationDeniedError('Only the provider can respond to this dispute')
    }

    // Validate response text
    if (input.responseText.length < 20) {
      throw new InvalidRequestError('Response must be at least 20 characters')
    }

    if (input.responseText.length > 5000) {
      throw new InvalidRequestError('Response must not exceed 5000 characters')
    }

    // Validate evidence URLs
    if (input.sellerEvidenceUrls && input.sellerEvidenceUrls.length > 10) {
      throw new InvalidRequestError('Maximum 10 evidence URLs allowed')
    }

    const updated = await disputeRepository.update(disputeId, dispute.version, {
      sellerEvidenceUrls: input.sellerEvidenceUrls ?? [],
      sellerRespondedAt: now().toISOString() as UtcTimestamp,
      sellerResponseText: input.responseText,
      status: 'UNDER_REVIEW',
    })

    return toDisputeDto(updated)
  }

  async function resolveDispute(
    actorUserId: Uuidv7,
    disputeId: Uuidv7,
    input: Readonly<{
      resolutionAmount?: MoneyMinor
      resolutionNotes: string
      resolutionType: DisputeResolutionType
    }>,
  ): Promise<DisputeDto> {
    const dispute = await disputeRepository.findById(disputeId)
    if (!dispute) {
      throw new DisputeNotFoundError(disputeId)
    }

    // Validate resolution notes
    if (input.resolutionNotes.length < 20) {
      throw new InvalidRequestError('Resolution notes must be at least 20 characters')
    }

    if (input.resolutionNotes.length > 2000) {
      throw new InvalidRequestError('Resolution notes must not exceed 2000 characters')
    }

    // Validate resolution amount for partial refunds
    if (
      input.resolutionType === 'REFUND_PARTIAL' &&
      (!input.resolutionAmount || input.resolutionAmount.minorUnits <= 0)
    ) {
      throw new InvalidRequestError('Partial refund requires a valid resolution amount')
    }

    const updated = await disputeRepository.update(disputeId, dispute.version, {
      resolutionAmount: input.resolutionAmount ?? null,
      resolutionNotes: input.resolutionNotes,
      resolutionType: input.resolutionType,
      resolvedAt: now().toISOString() as UtcTimestamp,
      resolvedBy: actorUserId,
      reviewedByModeratorId: actorUserId,
      status: 'RESOLVED',
    })

    // Release payout hold
    if (dispute.payoutHoldApplied) {
      await disputeRepository.update(updated.id, updated.version, {
        payoutHoldApplied: false,
      })
    }

    return toDisputeDto(await disputeRepository.findById(disputeId)!)
  }

  return {
    addSellerResponse,
    createDispute,
    createModerationCase,
    createReport,
    resolveDispute,
    takeModerationAction,
  }
}

function toReportDto(record: ReportRecord): ReportDto {
  return {
    assignedModeratorId: record.assignedModeratorId,
    createdAt: record.createdAt,
    description: record.description,
    id: record.id,
    moderationCaseId: record.moderationCaseId,
    reason: record.reason,
    reporterUserId: record.reporterUserId,
    resolvedAt: record.resolvedAt,
    resolutionNotes: record.resolutionNotes,
    status: record.status,
    targetId: record.targetId,
    targetType: record.targetType,
    updatedAt: record.updatedAt,
    version: record.version,
  }
}

function toModerationCaseDto(record: ModerationCaseRecord): ModerationCaseDto {
  return {
    actionDuration: record.actionDuration,
    actionReason: record.actionReason,
    actionTaken: record.actionTaken,
    actionedAt: record.actionedAt,
    assignedModeratorId: record.assignedModeratorId,
    createdAt: record.createdAt,
    evidenceSnapshot: record.evidenceSnapshot,
    id: record.id,
    priority: record.priority,
    reportIds: record.reportIds,
    status: record.status,
    targetId: record.targetId,
    targetType: record.targetType,
    updatedAt: record.updatedAt,
    version: record.version,
  }
}

function toDisputeDto(record: DisputeRecord): DisputeDto {
  return {
    buyerEvidenceUrls: record.buyerEvidenceUrls,
    buyerUserId: record.buyerUserId,
    category: record.category,
    createdAt: record.createdAt,
    deadline: record.deadline,
    description: record.description,
    id: record.id,
    orderId: record.orderId,
    payoutHoldAmount: record.payoutHoldAmount,
    payoutHoldApplied: record.payoutHoldApplied,
    providerUserId: record.providerUserId,
    requestedResolution: record.requestedResolution,
    resolutionAmount: record.resolutionAmount,
    resolutionNotes: record.resolutionNotes,
    resolutionType: record.resolutionType,
    resolvedAt: record.resolvedAt,
    reviewedByModeratorId: record.reviewedByModeratorId,
    sellerEvidenceUrls: record.sellerEvidenceUrls,
    sellerRespondedAt: record.sellerRespondedAt,
    sellerResponseText: record.sellerResponseText,
    status: record.status,
    updatedAt: record.updatedAt,
    version: record.version,
  }
}

export type ModerationDisputeService = ReturnType<typeof createModerationDisputeService>
