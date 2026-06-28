import {
  AuthorizationDeniedError as AuthzDenied,
  type ClockPort,
} from './identity.js'

// Re-export for use in tests and API
export { AuthorizationDeniedError } from './identity.js'

import {
  type OrderMilestoneRecord,
  type OrderMilestoneRepository,
  type OrderRecord,
  type OrderRepository,
  type ProviderProfileRepository,
  type Uuidv7,
} from '@pim/domain'

export type OrderMilestoneDto = Readonly<{
  id: Uuidv7
  orderId: Uuidv7
  sequence: number
  title: string
  description: string | null
  dueAt: string | null
  status: string
  submittedAt: string | null
  submittedByUserId: Uuidv7 | null
  approvedAt: string | null
  approvedByUserId: Uuidv7 | null
  revisionRequestedAt: string | null
  revisionRequestedByUserId: Uuidv7 | null
  revisionNotes: string | null
  revisionCount: number
  deliverableAssetIds: readonly Uuidv7[]
  version: number
}>

export class OrderMilestoneNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'OrderMilestoneNotFoundError'
  }
}

export class InvalidMilestoneStateError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION'
  readonly fields: readonly string[]
  readonly status = 409

  constructor(message: string, fields: readonly string[] = ['status']) {
    super(message)
    this.name = 'InvalidMilestoneStateError'
    this.fields = fields
  }
}

export class MilestoneRevisionLimitError extends Error {
  readonly code = 'REVISION_LIMIT_EXCEEDED'
  readonly fields = ['revisionCount']
  readonly status = 409

  constructor(message: string) {
    super(message)
    this.name = 'MilestoneRevisionLimitError'
  }
}

const MAX_REVISION_COUNT = 5

export type OrderMilestoneServicePorts = Readonly<{
  clock: ClockPort
  orderRepository: OrderRepository
  orderMilestoneRepository: OrderMilestoneRepository
  providerProfileRepository: ProviderProfileRepository
}>

export function createOrderMilestoneService(ports: OrderMilestoneServicePorts) {
  const { clock, orderRepository, orderMilestoneRepository, providerProfileRepository } =
    ports

  function toDto(milestone: OrderMilestoneRecord): OrderMilestoneDto {
    return {
      id: milestone.id,
      orderId: milestone.orderId,
      sequence: milestone.sequence,
      title: milestone.title,
      description: milestone.description,
      dueAt: milestone.dueAt,
      status: milestone.status,
      submittedAt: milestone.submittedAt,
      submittedByUserId: milestone.submittedByUserId,
      approvedAt: milestone.approvedAt,
      approvedByUserId: milestone.approvedByUserId,
      revisionRequestedAt: milestone.revisionRequestedAt,
      revisionRequestedByUserId: milestone.revisionRequestedByUserId,
      revisionNotes: milestone.revisionNotes,
      revisionCount: milestone.revisionCount,
      deliverableAssetIds: milestone.deliverableAssetIds,
      version: milestone.version,
    }
  }

  async function verifyProviderAccess(
    actorUserId: Uuidv7,
    providerProfileId: Uuidv7,
  ): Promise<void> {
    const profile = await providerProfileRepository.findById(providerProfileId)
    if (!profile || profile.ownerUserId !== actorUserId) {
      throw new AuthzDenied('Only the provider owner can perform this action')
    }
  }

  async function getMilestone(
    actorUserId: Uuidv7,
    milestoneId: Uuidv7,
  ): Promise<OrderMilestoneDto> {
    const milestone = await orderMilestoneRepository.findById(milestoneId)
    if (!milestone) {
      throw new OrderMilestoneNotFoundError(`Milestone ${milestoneId} not found`)
    }

    // Verify order access
    const order = await orderRepository.findById(milestone.orderId)
    if (!order) {
      throw new OrderMilestoneNotFoundError(`Order ${milestone.orderId} not found`)
    }

    const providerProfile = await providerProfileRepository.findById(
      order.providerProfileId,
    )
    if (
      order.buyerUserId !== actorUserId &&
      providerProfile?.ownerUserId !== actorUserId
    ) {
      throw new AuthzDenied('Only buyer or provider can view milestones')
    }

    return toDto(milestone)
  }

  async function listMilestones(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
  ): Promise<readonly OrderMilestoneDto[]> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new Error(`Order ${orderId} not found`)
    }

    const providerProfile = await providerProfileRepository.findById(
      order.providerProfileId,
    )
    if (
      order.buyerUserId !== actorUserId &&
      providerProfile?.ownerUserId !== actorUserId
    ) {
      throw new AuthzDenied('Only buyer or provider can view milestones')
    }

    const milestones = await orderMilestoneRepository.listByOrderId(orderId)
    return milestones.map(toDto)
  }

  async function submitMilestone(
    actorUserId: Uuidv7,
    milestoneId: Uuidv7,
    expectedVersion: number,
    deliverableAssetIds: readonly Uuidv7[],
  ): Promise<OrderMilestoneDto> {
    const milestone = await orderMilestoneRepository.findById(milestoneId)
    if (!milestone) {
      throw new OrderMilestoneNotFoundError(`Milestone ${milestoneId} not found`)
    }

    // Verify provider access
    const order = await orderRepository.findById(milestone.orderId)
    if (!order) {
      throw new Error(`Order ${milestone.orderId} not found`)
    }
    await verifyProviderAccess(actorUserId, order.providerProfileId)

    // Verify state
    if (milestone.status !== 'PENDING' && milestone.status !== 'REVISION_REQUESTED') {
      throw new InvalidMilestoneStateError(
        `Cannot submit milestone from status ${milestone.status}`,
        ['status'],
      )
    }

    const now = clock.now()
    const updated = await orderMilestoneRepository.update(
      {
        ...milestone,
        status: 'SUBMITTED',
        submittedAt: now,
        submittedByUserId: actorUserId,
        deliverableAssetIds,
        revisionNotes: null,
        revisionRequestedAt: null,
        revisionRequestedByUserId: null,
      },
      expectedVersion,
    )

    return toDto(updated)
  }

  async function requestMilestoneRevision(
    actorUserId: Uuidv7,
    milestoneId: Uuidv7,
    expectedVersion: number,
    revisionNotes: string,
  ): Promise<OrderMilestoneDto> {
    const milestone = await orderMilestoneRepository.findById(milestoneId)
    if (!milestone) {
      throw new OrderMilestoneNotFoundError(`Milestone ${milestoneId} not found`)
    }

    // Verify buyer access
    const order = await orderRepository.findById(milestone.orderId)
    if (!order) {
      throw new Error(`Order ${milestone.orderId} not found`)
    }
    if (order.buyerUserId !== actorUserId) {
      throw new AuthzDenied('Only the buyer can request milestone revisions')
    }

    // Verify state
    if (milestone.status !== 'SUBMITTED') {
      throw new InvalidMilestoneStateError(
        `Cannot request revision for milestone with status ${milestone.status}`,
        ['status'],
      )
    }

    // Check revision limit
    if (milestone.revisionCount >= MAX_REVISION_COUNT) {
      throw new MilestoneRevisionLimitError(
        `Milestone has reached the maximum revision limit (${MAX_REVISION_COUNT})`,
      )
    }

    const now = clock.now()
    const updated = await orderMilestoneRepository.update(
      {
        ...milestone,
        status: 'REVISION_REQUESTED',
        revisionRequestedAt: now,
        revisionRequestedByUserId: actorUserId,
        revisionNotes,
        revisionCount: milestone.revisionCount + 1,
      },
      expectedVersion,
    )

    return toDto(updated)
  }

  async function approveMilestone(
    actorUserId: Uuidv7,
    milestoneId: Uuidv7,
    expectedVersion: number,
  ): Promise<OrderMilestoneDto> {
    const milestone = await orderMilestoneRepository.findById(milestoneId)
    if (!milestone) {
      throw new OrderMilestoneNotFoundError(`Milestone ${milestoneId} not found`)
    }

    // Verify buyer access
    const order = await orderRepository.findById(milestone.orderId)
    if (!order) {
      throw new Error(`Order ${milestone.orderId} not found`)
    }
    if (order.buyerUserId !== actorUserId) {
      throw new AuthzDenied('Only the buyer can approve milestones')
    }

    // Verify state
    if (milestone.status !== 'SUBMITTED') {
      throw new InvalidMilestoneStateError(
        `Cannot approve milestone with status ${milestone.status}`,
        ['status'],
      )
    }

    const now = clock.now()
    const updated = await orderMilestoneRepository.update(
      {
        ...milestone,
        status: 'APPROVED',
        approvedAt: now,
        approvedByUserId: actorUserId,
      },
      expectedVersion,
    )

    return toDto(updated)
  }

  return Object.freeze({
    getMilestone,
    listMilestones,
    submitMilestone,
    requestMilestoneRevision,
    approveMilestone,
  })
}

export type OrderMilestoneService = ReturnType<typeof createOrderMilestoneService>
