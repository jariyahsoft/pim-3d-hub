import {
  AuthorizationDeniedError as AuthzDenied,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'

// Re-export for use in tests and API
export { AuthorizationDeniedError } from './identity.js'

import {
  type CreateOrderChangeRequestInput,
  type MoneyMinor,
  type OrderChangeRequestRecord,
  type OrderChangeRequestRepository,
  type OrderChangeRequestType,
  type OrderRepository,
  type ProviderProfileRepository,
  type Uuidv7,
} from '@pim/domain'

export type OrderChangeRequestDto = Readonly<{
  id: Uuidv7
  orderId: Uuidv7
  requestType: OrderChangeRequestType
  requestedByUserId: Uuidv7
  title: string
  description: string
  priceAdjustment: MoneyMinor | null
  scheduleAdjustmentDays: number | null
  scopeDetails: string | null
  status: string
  approvedAt: string | null
  approvedByUserId: Uuidv7 | null
  rejectedAt: string | null
  rejectedByUserId: Uuidv7 | null
  rejectionReason: string | null
  version: number
}>

export class OrderChangeRequestNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'OrderChangeRequestNotFoundError'
  }
}

export class InvalidChangeRequestStateError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION'
  readonly fields: readonly string[]
  readonly status = 409

  constructor(message: string, fields: readonly string[] = ['status']) {
    super(message)
    this.name = 'InvalidChangeRequestStateError'
    this.fields = fields
  }
}

export type CreateChangeRequestCommand = Readonly<{
  actorUserId: Uuidv7
  orderId: Uuidv7
  requestType: OrderChangeRequestType
  title: string
  description: string
  priceAdjustment?: MoneyMinor | null
  scheduleAdjustmentDays?: number | null
  scopeDetails?: string | null
}>

export type OrderChangeRequestServicePorts = Readonly<{
  clock: ClockPort
  uuidGenerator: UuidGeneratorPort
  orderRepository: OrderRepository
  orderChangeRequestRepository: OrderChangeRequestRepository
  providerProfileRepository: ProviderProfileRepository
}>

export function createOrderChangeRequestService(ports: OrderChangeRequestServicePorts) {
  const {
    clock,
    uuidGenerator,
    orderRepository,
    orderChangeRequestRepository,
    providerProfileRepository,
  } = ports

  function toDto(changeRequest: OrderChangeRequestRecord): OrderChangeRequestDto {
    return {
      id: changeRequest.id,
      orderId: changeRequest.orderId,
      requestType: changeRequest.requestType,
      requestedByUserId: changeRequest.requestedByUserId,
      title: changeRequest.title,
      description: changeRequest.description,
      priceAdjustment: changeRequest.priceAdjustment,
      scheduleAdjustmentDays: changeRequest.scheduleAdjustmentDays,
      scopeDetails: changeRequest.scopeDetails,
      status: changeRequest.status,
      approvedAt: changeRequest.approvedAt,
      approvedByUserId: changeRequest.approvedByUserId,
      rejectedAt: changeRequest.rejectedAt,
      rejectedByUserId: changeRequest.rejectedByUserId,
      rejectionReason: changeRequest.rejectionReason,
      version: changeRequest.version,
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

  async function createChangeRequest(
    command: CreateChangeRequestCommand,
  ): Promise<OrderChangeRequestDto> {
    const order = await orderRepository.findById(command.orderId)
    if (!order) {
      throw new Error(`Order ${command.orderId} not found`)
    }

    // Verify actor is buyer or provider
    const providerProfile = await providerProfileRepository.findById(
      order.providerProfileId,
    )
    const isBuyer = order.buyerUserId === command.actorUserId
    const isProvider = providerProfile?.ownerUserId === command.actorUserId

    if (!isBuyer && !isProvider) {
      throw new AuthzDenied('Only buyer or provider can create change requests')
    }

    // Verify order is in an active state (not terminal)
    const terminalStates = ['COMPLETED', 'CANCELLED', 'DISPUTED']
    if (terminalStates.includes(order.status)) {
      throw new InvalidChangeRequestStateError(
        `Cannot create change request for order with status ${order.status}`,
        ['orderId'],
      )
    }

    const input: CreateOrderChangeRequestInput = {
      id: uuidGenerator.next(),
      orderId: command.orderId,
      requestType: command.requestType,
      requestedByUserId: command.actorUserId,
      title: command.title,
      description: command.description,
      priceAdjustment: command.priceAdjustment ?? null,
      scheduleAdjustmentDays: command.scheduleAdjustmentDays ?? null,
      scopeDetails: command.scopeDetails ?? null,
      status: 'PENDING',
      createdBy: command.actorUserId,
    }

    const changeRequest = await orderChangeRequestRepository.create(input)
    return toDto(changeRequest)
  }

  async function getChangeRequest(
    actorUserId: Uuidv7,
    changeRequestId: Uuidv7,
  ): Promise<OrderChangeRequestDto> {
    const changeRequest =
      await orderChangeRequestRepository.findById(changeRequestId)
    if (!changeRequest) {
      throw new OrderChangeRequestNotFoundError(
        `Change request ${changeRequestId} not found`,
      )
    }

    // Verify order access
    const order = await orderRepository.findById(changeRequest.orderId)
    if (!order) {
      throw new Error(`Order ${changeRequest.orderId} not found`)
    }

    const providerProfile = await providerProfileRepository.findById(
      order.providerProfileId,
    )
    if (
      order.buyerUserId !== actorUserId &&
      providerProfile?.ownerUserId !== actorUserId
    ) {
      throw new AuthzDenied('Only buyer or provider can view change requests')
    }

    return toDto(changeRequest)
  }

  async function listChangeRequests(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
  ): Promise<readonly OrderChangeRequestDto[]> {
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
      throw new AuthzDenied('Only buyer or provider can view change requests')
    }

    const changeRequests = await orderChangeRequestRepository.listByOrderId(orderId)
    return changeRequests.map(toDto)
  }

  async function approveChangeRequest(
    actorUserId: Uuidv7,
    changeRequestId: Uuidv7,
    expectedVersion: number,
  ): Promise<OrderChangeRequestDto> {
    const changeRequest =
      await orderChangeRequestRepository.findById(changeRequestId)
    if (!changeRequest) {
      throw new OrderChangeRequestNotFoundError(
        `Change request ${changeRequestId} not found`,
      )
    }

    // Verify state
    if (changeRequest.status !== 'PENDING') {
      throw new InvalidChangeRequestStateError(
        `Cannot approve change request with status ${changeRequest.status}`,
        ['status'],
      )
    }

    // Verify approver is not the requester
    if (changeRequest.requestedByUserId === actorUserId) {
      throw new AuthzDenied('Cannot approve your own change request')
    }

    // Verify order access and actor is buyer or provider
    const order = await orderRepository.findById(changeRequest.orderId)
    if (!order) {
      throw new Error(`Order ${changeRequest.orderId} not found`)
    }

    const providerProfile = await providerProfileRepository.findById(
      order.providerProfileId,
    )
    const isBuyer = order.buyerUserId === actorUserId
    const isProvider = providerProfile?.ownerUserId === actorUserId

    if (!isBuyer && !isProvider) {
      throw new AuthzDenied('Only buyer or provider can approve change requests')
    }

    const now = clock.now()
    const updated = await orderChangeRequestRepository.update(
      {
        ...changeRequest,
        status: 'APPROVED',
        approvedAt: now,
        approvedByUserId: actorUserId,
      },
      expectedVersion,
    )

    // Note: This service does not mutate the order record itself
    // Price adjustments should be handled through a separate payment adjustment flow
    // Schedule adjustments should trigger order.expectedDeliveryAt updates
    // This preserves the original snapshot integrity

    return toDto(updated)
  }

  async function rejectChangeRequest(
    actorUserId: Uuidv7,
    changeRequestId: Uuidv7,
    expectedVersion: number,
    rejectionReason: string,
  ): Promise<OrderChangeRequestDto> {
    const changeRequest =
      await orderChangeRequestRepository.findById(changeRequestId)
    if (!changeRequest) {
      throw new OrderChangeRequestNotFoundError(
        `Change request ${changeRequestId} not found`,
      )
    }

    // Verify state
    if (changeRequest.status !== 'PENDING') {
      throw new InvalidChangeRequestStateError(
        `Cannot reject change request with status ${changeRequest.status}`,
        ['status'],
      )
    }

    // Verify rejector is not the requester
    if (changeRequest.requestedByUserId === actorUserId) {
      throw new AuthzDenied('Cannot reject your own change request')
    }

    // Verify order access and actor is buyer or provider
    const order = await orderRepository.findById(changeRequest.orderId)
    if (!order) {
      throw new Error(`Order ${changeRequest.orderId} not found`)
    }

    const providerProfile = await providerProfileRepository.findById(
      order.providerProfileId,
    )
    const isBuyer = order.buyerUserId === actorUserId
    const isProvider = providerProfile?.ownerUserId === actorUserId

    if (!isBuyer && !isProvider) {
      throw new AuthzDenied('Only buyer or provider can reject change requests')
    }

    const now = clock.now()
    const updated = await orderChangeRequestRepository.update(
      {
        ...changeRequest,
        status: 'REJECTED',
        rejectedAt: now,
        rejectedByUserId: actorUserId,
        rejectionReason,
      },
      expectedVersion,
    )

    return toDto(updated)
  }

  return Object.freeze({
    createChangeRequest,
    getChangeRequest,
    listChangeRequests,
    approveChangeRequest,
    rejectChangeRequest,
  })
}

export type OrderChangeRequestService = ReturnType<
  typeof createOrderChangeRequestService
>
