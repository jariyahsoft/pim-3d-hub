import {
  AuthorizationDeniedError as AuthzDenied,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'

// Re-export for use in tests and API
export { AuthorizationDeniedError } from './identity.js'
import {
  RepositoryConflictError,
  createMoneyMinor,
  type CreateOrderInput,
  type CreateOrderItemInput,
  type CreateOrderStatusEventInput,
  type MoneyMinor,
  type OrderAddressSnapshot,
  type OrderFilter,
  type OrderItemRepository,
  type OrderParticipantSnapshot,
  type OrderRecord,
  type OrderRepository,
  type OrderSortField,
  type OrderSourceSnapshot,
  type OrderStatusEventRepository,
  type ProposalRecord,
  type ProposalRepository,
  type ProviderProfileRecord,
  type ProviderProfileRepository,
  type RepositoryListPage,
  type ServiceRequestRecord,
  type ServiceRequestRepository,
  type SortDirection,
  type UserRecord,
  type UserRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type OrderDto = Readonly<{
  id: Uuidv7
  orderNumber: string
  buyerUserId: Uuidv7
  providerProfileId: Uuidv7
  serviceRequestId: Uuidv7 | null
  status: string
  currency: string
  subtotal: MoneyMinor
  taxAmount: MoneyMinor | null
  shippingAmount: MoneyMinor | null
  totalAmount: MoneyMinor
  buyerSnapshot: OrderParticipantSnapshot
  providerSnapshot: OrderParticipantSnapshot
  shippingAddressSnapshot: OrderAddressSnapshot | null
  sourceSnapshot: OrderSourceSnapshot
  notes: string | null
  expectedDeliveryAt: UtcTimestamp | null
  confirmedAt: UtcTimestamp | null
  cancelledAt: UtcTimestamp | null
  completedAt: UtcTimestamp | null
  version: number
}>

export class OrderNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND'
  readonly status = 404

  constructor(message: string) {
    super(message)
    this.name = 'OrderNotFoundError'
  }
}

export class InvalidOrderStateError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION'
  readonly fields: readonly string[]
  readonly status = 409

  constructor(message: string, fields: readonly string[] = ['status']) {
    super(message)
    this.name = 'InvalidOrderStateError'
    this.fields = fields
  }
}

export type OrderValidationError = Error &
  Readonly<{
    code: 'VALIDATION_ERROR'
    fields: readonly string[]
    status: 400
  }>

export type CreateOrderFromProposalCommand = Readonly<{
  actorUserId: Uuidv7
  proposalId: Uuidv7
  idempotencyKey: string
  expectedProposalVersion: number
  shippingAddressSnapshot?: OrderAddressSnapshot | null
  notes?: string | null
}>

export type OrderServicePorts = Readonly<{
  clock: ClockPort
  orderRepository: OrderRepository
  orderItemRepository: OrderItemRepository
  orderStatusEventRepository: OrderStatusEventRepository
  proposalRepository: ProposalRepository
  providerProfileRepository: ProviderProfileRepository
  serviceRequestRepository: ServiceRequestRepository
  userRepository: UserRepository
  uuidGenerator: UuidGeneratorPort
}>

export function assertOrderVersionConflict(
  error: unknown,
): asserts error is RepositoryConflictError {
  if (!(error instanceof RepositoryConflictError)) {
    throw error
  }
}

export function createOrderService(ports: OrderServicePorts) {
  const {
    clock,
    orderRepository,
    orderItemRepository,
    orderStatusEventRepository,
    proposalRepository,
    providerProfileRepository,
    serviceRequestRepository,
    userRepository,
    uuidGenerator,
  } = ports

  function generateOrderNumber(): string {
    // Generate format: ORD-YYYYMMDD-XXXXX
    const now = clock.now()
    const date = now.substring(0, 10).replace(/-/g, '')
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')
    return `ORD-${date}-${random}`
  }

  async function createOrderFromProposal(
    command: CreateOrderFromProposalCommand,
  ): Promise<OrderDto> {
    const {
      actorUserId,
      proposalId,
      idempotencyKey,
      expectedProposalVersion,
      shippingAddressSnapshot,
      notes,
    } = command

    // Fetch proposal
    const proposal = await proposalRepository.findById(proposalId)
    if (!proposal) {
      throw new OrderNotFoundError(`Proposal ${proposalId} not found`)
    }

    // Verify proposal is accepted
    if (proposal.status !== 'ACCEPTED') {
      throw new InvalidOrderStateError(
        'Can only create order from accepted proposal',
        ['proposalId', 'status'],
      )
    }

    // Check version
    if (proposal.version !== expectedProposalVersion) {
      throw new RepositoryConflictError({
        entityName: 'Proposal',
        entityId: proposalId,
        expectedVersion: expectedProposalVersion,
        actualVersion: proposal.version,
      })
    }

    // Fetch service request
    const serviceRequest = await serviceRequestRepository.findById(
      proposal.serviceRequestId,
    )
    if (!serviceRequest) {
      throw new OrderNotFoundError(
        `Service request ${proposal.serviceRequestId} not found`,
      )
    }

    // Verify actor is buyer
    if (serviceRequest.buyerUserId !== actorUserId) {
      throw new AuthzDenied('Only buyer can create order from proposal')
    }

    // Check for existing order with same idempotency key
    // (Simplified - in production would use dedicated idempotency table)

    // Fetch buyer user
    const buyer = await userRepository.findById(actorUserId)
    if (!buyer) {
      throw new OrderNotFoundError(`Buyer user ${actorUserId} not found`)
    }

    // Fetch provider profile and owner
    const providerProfile = await providerProfileRepository.findById(
      proposal.providerProfileId,
    )
    if (!providerProfile) {
      throw new OrderNotFoundError(
        `Provider profile ${proposal.providerProfileId} not found`,
      )
    }

    const provider = await userRepository.findById(providerProfile.ownerUserId)
    if (!provider) {
      throw new OrderNotFoundError(
        `Provider user ${providerProfile.ownerUserId} not found`,
      )
    }

    // Create snapshots
    const buyerSnapshot: OrderParticipantSnapshot = {
      userId: buyer.id,
      displayName: (buyer as any).displayName ?? null,
      email: (buyer as any).email ?? null,
      phone: (buyer as any).phone ?? null,
    }

    const providerSnapshot: OrderParticipantSnapshot = {
      userId: provider.id,
      displayName: (provider as any).displayName ?? null,
      email: (provider as any).email ?? null,
      phone: (provider as any).phone ?? null,
    }

    const sourceSnapshot: OrderSourceSnapshot = {
      sourceType: 'PROPOSAL',
      sourceId: proposal.id,
      sourceRevisionNumber: proposal.revisionNumber,
      snapshotData: JSON.stringify({
        lineItems: proposal.lineItems,
        milestones: proposal.milestones,
        currency: proposal.currency,
        totalAmount: proposal.totalAmount,
        notes: proposal.notes,
        exclusions: proposal.exclusions,
        validUntil: proposal.validUntil,
        submittedAt: proposal.submittedAt,
      }),
    }

    // Calculate totals (simplified - no tax/shipping calculation yet)
    const subtotal = proposal.totalAmount
    const taxAmount = null
    const shippingAmount = null
    const totalAmount = subtotal

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Create order
    const orderId = uuidGenerator.next()
    const order = await orderRepository.create({
      id: orderId,
      orderNumber,
      buyerUserId: actorUserId,
      providerProfileId: proposal.providerProfileId,
      serviceRequestId: proposal.serviceRequestId,
      status: 'AWAITING_PROVIDER_CONFIRMATION',
      currency: proposal.currency,
      subtotal,
      taxAmount,
      shippingAmount,
      totalAmount,
      buyerSnapshot,
      providerSnapshot,
      shippingAddressSnapshot: shippingAddressSnapshot ?? null,
      sourceSnapshot,
      notes: notes ?? null,
      expectedDeliveryAt: null,
      createdBy: actorUserId,
    })

    // Create order items from proposal line items
    for (let i = 0; i < proposal.lineItems.length; i++) {
      const lineItem = proposal.lineItems[i]!
      await orderItemRepository.create({
        orderId: order.id,
        itemType: lineItem.itemType,
        description: lineItem.description,
        quantity: lineItem.quantity,
        unitPrice: createMoneyMinor(
          Math.floor(lineItem.amount.minorUnits / lineItem.quantity),
          lineItem.amount.currency,
        ),
        totalPrice: lineItem.amount,
        sequence: i + 1,
        createdBy: actorUserId,
      })
    }

    // Create initial status event
    await orderStatusEventRepository.create({
      orderId: order.id,
      fromStatus: null,
      toStatus: 'AWAITING_PROVIDER_CONFIRMATION',
      actorUserId,
      reason: 'Order created from accepted proposal',
      metadata: {
        proposalId: proposal.id,
        idempotencyKey,
      },
      createdBy: actorUserId,
    })

    // Return DTO
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      buyerUserId: order.buyerUserId,
      providerProfileId: order.providerProfileId,
      serviceRequestId: order.serviceRequestId,
      status: order.status,
      currency: order.currency,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      totalAmount: order.totalAmount,
      buyerSnapshot: order.buyerSnapshot,
      providerSnapshot: order.providerSnapshot,
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      sourceSnapshot: order.sourceSnapshot,
      notes: order.notes,
      expectedDeliveryAt: order.expectedDeliveryAt,
      confirmedAt: order.confirmedAt,
      cancelledAt: order.cancelledAt,
      completedAt: order.completedAt,
      version: order.version,
    }
  }

  async function getOrder(actorUserId: Uuidv7, orderId: Uuidv7): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    // Verify access: buyer or provider
    const providerProfile = await providerProfileRepository.findById(order.providerProfileId)
    if (
      order.buyerUserId !== actorUserId &&
      providerProfile?.ownerUserId !== actorUserId
    ) {
      throw new AuthzDenied('Only buyer or provider can view this order')
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      buyerUserId: order.buyerUserId,
      providerProfileId: order.providerProfileId,
      serviceRequestId: order.serviceRequestId,
      status: order.status,
      currency: order.currency,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      totalAmount: order.totalAmount,
      buyerSnapshot: order.buyerSnapshot,
      providerSnapshot: order.providerSnapshot,
      shippingAddressSnapshot: order.shippingAddressSnapshot,
      sourceSnapshot: order.sourceSnapshot,
      notes: order.notes,
      expectedDeliveryAt: order.expectedDeliveryAt,
      confirmedAt: order.confirmedAt,
      cancelledAt: order.cancelledAt,
      completedAt: order.completedAt,
      version: order.version,
    }
  }

  async function listOrders(
    actorUserId: Uuidv7,
    filter: OrderFilter,
    limit: number,
    cursor: string | undefined,
    sortField: OrderSortField,
    sortDirection: SortDirection,
  ): Promise<RepositoryListPage<OrderDto>> {
    const page = await orderRepository.list({
      ...(cursor && { cursor }),
      filter,
      limit,
      sort: {
        direction: sortDirection,
        field: sortField,
      },
    })

    // Filter by authorization
    const authorizedOrders: OrderDto[] = []

    for (const order of page.items) {
      const providerProfile = await providerProfileRepository.findById(
        order.providerProfileId,
      )

      if (
        order.buyerUserId === actorUserId ||
        providerProfile?.ownerUserId === actorUserId
      ) {
        authorizedOrders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          buyerUserId: order.buyerUserId,
          providerProfileId: order.providerProfileId,
          serviceRequestId: order.serviceRequestId,
          status: order.status,
          currency: order.currency,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          shippingAmount: order.shippingAmount,
          totalAmount: order.totalAmount,
          buyerSnapshot: order.buyerSnapshot,
          providerSnapshot: order.providerSnapshot,
          shippingAddressSnapshot: order.shippingAddressSnapshot,
          sourceSnapshot: order.sourceSnapshot,
          notes: order.notes,
          expectedDeliveryAt: order.expectedDeliveryAt,
          confirmedAt: order.confirmedAt,
          cancelledAt: order.cancelledAt,
          completedAt: order.completedAt,
          version: order.version,
        })
      }
    }

    return {
      items: authorizedOrders,
      nextCursor: page.nextCursor,
    }
  }

  // Helper function to verify actor is provider
  async function verifyProviderAccess(
    actorUserId: Uuidv7,
    providerProfileId: Uuidv7,
  ): Promise<void> {
    const providerProfile = await providerProfileRepository.findById(providerProfileId)
    if (!providerProfile || providerProfile.ownerUserId !== actorUserId) {
      throw new AuthzDenied('Only provider can perform this action')
    }
  }

  // Helper function to create status event and update order
  async function transitionOrderState(
    order: OrderRecord,
    toStatus: string,
    actorUserId: Uuidv7,
    expectedVersion: number,
    reason: string | null,
    metadata: Record<string, unknown> = {},
  ): Promise<OrderDto> {
    // Update order status
    const updatedOrder = await orderRepository.update(
      {
        ...order,
        status: toStatus as any,
        updatedBy: actorUserId,
      },
      expectedVersion,
    )

    // Create status event
    await orderStatusEventRepository.create({
      orderId: order.id,
      fromStatus: order.status as any,
      toStatus: toStatus as any,
      actorUserId,
      reason,
      metadata,
      createdBy: actorUserId,
    })

    return {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      buyerUserId: updatedOrder.buyerUserId,
      providerProfileId: updatedOrder.providerProfileId,
      serviceRequestId: updatedOrder.serviceRequestId,
      status: updatedOrder.status,
      currency: updatedOrder.currency,
      subtotal: updatedOrder.subtotal,
      taxAmount: updatedOrder.taxAmount,
      shippingAmount: updatedOrder.shippingAmount,
      totalAmount: updatedOrder.totalAmount,
      buyerSnapshot: updatedOrder.buyerSnapshot,
      providerSnapshot: updatedOrder.providerSnapshot,
      shippingAddressSnapshot: updatedOrder.shippingAddressSnapshot,
      sourceSnapshot: updatedOrder.sourceSnapshot,
      notes: updatedOrder.notes,
      expectedDeliveryAt: updatedOrder.expectedDeliveryAt,
      confirmedAt: updatedOrder.confirmedAt,
      cancelledAt: updatedOrder.cancelledAt,
      completedAt: updatedOrder.completedAt,
      version: updatedOrder.version,
    }
  }

  // Transition: Provider confirms order
  async function confirmOrder(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    // Verify actor is provider
    await verifyProviderAccess(actorUserId, order.providerProfileId)

    // Verify source state
    if (order.status !== 'AWAITING_PROVIDER_CONFIRMATION') {
      throw new InvalidOrderStateError(
        `Cannot confirm order from status ${order.status}`,
        ['status'],
      )
    }

    const now = clock.now()
    return transitionOrderState(
      { ...order, confirmedAt: now },
      'AWAITING_PAYMENT',
      actorUserId,
      expectedVersion,
      reason ?? 'Provider confirmed order',
      { confirmedAt: now },
    )
  }

  // Transition: Payment captured (webhook)
  async function markOrderPaid(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    paymentIntentId: string,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    // Verify source state
    if (order.status !== 'AWAITING_PAYMENT') {
      throw new InvalidOrderStateError(
        `Cannot mark paid from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'PAID',
      actorUserId,
      expectedVersion,
      reason ?? 'Payment captured',
      { paymentIntentId },
    )
  }

  // Transition: Provider starts preparation
  async function startPreparation(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    await verifyProviderAccess(actorUserId, order.providerProfileId)

    if (order.status !== 'PAID') {
      throw new InvalidOrderStateError(
        `Cannot start preparation from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'PREPARING',
      actorUserId,
      expectedVersion,
      reason ?? 'Provider started preparation',
    )
  }

  // Transition: Provider starts production
  async function startProduction(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    await verifyProviderAccess(actorUserId, order.providerProfileId)

    if (order.status !== 'PREPARING') {
      throw new InvalidOrderStateError(
        `Cannot start production from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'IN_PRODUCTION',
      actorUserId,
      expectedVersion,
      reason ?? 'Production started',
    )
  }

  // Transition: Provider moves to post-processing
  async function startPostProcessing(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    await verifyProviderAccess(actorUserId, order.providerProfileId)

    if (order.status !== 'IN_PRODUCTION') {
      throw new InvalidOrderStateError(
        `Cannot start post-processing from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'POST_PROCESSING',
      actorUserId,
      expectedVersion,
      reason ?? 'Post-processing started',
    )
  }

  // Transition: Provider moves to quality check
  async function startQualityCheck(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    await verifyProviderAccess(actorUserId, order.providerProfileId)

    if (order.status !== 'POST_PROCESSING') {
      throw new InvalidOrderStateError(
        `Cannot start quality check from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'QUALITY_CHECK',
      actorUserId,
      expectedVersion,
      reason ?? 'Quality check started',
    )
  }

  // Transition: Provider marks ready to ship
  async function markReadyToShip(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    await verifyProviderAccess(actorUserId, order.providerProfileId)

    if (order.status !== 'QUALITY_CHECK') {
      throw new InvalidOrderStateError(
        `Cannot mark ready to ship from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'READY_TO_SHIP',
      actorUserId,
      expectedVersion,
      reason ?? 'Quality check passed, ready to ship',
    )
  }

  // Transition: Provider ships order
  async function shipOrder(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    trackingNumber: string,
    carrier?: string | null,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    await verifyProviderAccess(actorUserId, order.providerProfileId)

    if (order.status !== 'READY_TO_SHIP') {
      throw new InvalidOrderStateError(
        `Cannot ship order from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'SHIPPED',
      actorUserId,
      expectedVersion,
      reason ?? 'Order shipped',
      { trackingNumber, carrier },
    )
  }

  // Transition: Mark order delivered
  async function markDelivered(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    // Either buyer or provider can mark delivered
    const providerProfile = await providerProfileRepository.findById(order.providerProfileId)
    const isBuyer = order.buyerUserId === actorUserId
    const isProvider = providerProfile?.ownerUserId === actorUserId

    if (!isBuyer && !isProvider) {
      throw new AuthzDenied('Only buyer or provider can mark order delivered')
    }

    if (order.status !== 'SHIPPED') {
      throw new InvalidOrderStateError(
        `Cannot mark delivered from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'DELIVERED',
      actorUserId,
      expectedVersion,
      reason ?? 'Order delivered',
    )
  }

  // Transition: Complete order
  async function completeOrder(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason?: string | null,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    // Only buyer can complete order
    if (order.buyerUserId !== actorUserId) {
      throw new AuthzDenied('Only buyer can complete order')
    }

    if (order.status !== 'DELIVERED') {
      throw new InvalidOrderStateError(
        `Cannot complete order from status ${order.status}`,
        ['status'],
      )
    }

    const now = clock.now()
    return transitionOrderState(
      { ...order, completedAt: now },
      'COMPLETED',
      actorUserId,
      expectedVersion,
      reason ?? 'Order completed',
      { completedAt: now },
    )
  }

  // Transition: Cancel order
  async function cancelOrder(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason: string,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    // Verify actor permission based on current state
    const providerProfile = await providerProfileRepository.findById(order.providerProfileId)
    const isBuyer = order.buyerUserId === actorUserId
    const isProvider = providerProfile?.ownerUserId === actorUserId

    // Provider can cancel from AWAITING_PROVIDER_CONFIRMATION
    // Buyer can cancel from AWAITING_PAYMENT or PAID (with conditions)
    // Both can cancel from certain states
    if (order.status === 'AWAITING_PROVIDER_CONFIRMATION' && !isProvider) {
      throw new AuthzDenied('Only provider can cancel during confirmation')
    } else if (order.status === 'AWAITING_PAYMENT' && !isBuyer) {
      throw new AuthzDenied('Only buyer can cancel during payment')
    } else if (!isBuyer && !isProvider) {
      throw new AuthzDenied('Only buyer or provider can cancel order')
    }

    // Check if cancellation is allowed from current state
    const cancellableStates = [
      'AWAITING_PROVIDER_CONFIRMATION',
      'AWAITING_PAYMENT',
      'PAID',
    ]

    if (!cancellableStates.includes(order.status)) {
      throw new InvalidOrderStateError(
        `Cannot cancel order from status ${order.status}`,
        ['status'],
      )
    }

    const now = clock.now()
    return transitionOrderState(
      { ...order, cancelledAt: now },
      'CANCELLED',
      actorUserId,
      expectedVersion,
      reason,
      { cancelledAt: now },
    )
  }

  // Transition: Dispute order
  async function disputeOrder(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
    reason: string,
    evidence?: Record<string, unknown>,
  ): Promise<OrderDto> {
    const order = await orderRepository.findById(orderId)
    if (!order) {
      throw new OrderNotFoundError(`Order ${orderId} not found`)
    }

    // Either buyer or provider can dispute
    const providerProfile = await providerProfileRepository.findById(order.providerProfileId)
    const isBuyer = order.buyerUserId === actorUserId
    const isProvider = providerProfile?.ownerUserId === actorUserId

    if (!isBuyer && !isProvider) {
      throw new AuthzDenied('Only buyer or provider can dispute order')
    }

    // Can dispute from IN_PRODUCTION, SHIPPED, or DELIVERED
    const disputableStates = ['IN_PRODUCTION', 'SHIPPED', 'DELIVERED']

    if (!disputableStates.includes(order.status)) {
      throw new InvalidOrderStateError(
        `Cannot dispute order from status ${order.status}`,
        ['status'],
      )
    }

    return transitionOrderState(
      order,
      'DISPUTED',
      actorUserId,
      expectedVersion,
      reason,
      { evidence, disputedAt: clock.now() },
    )
  }

  return Object.freeze({
    createOrderFromProposal,
    getOrder,
    listOrders,
    confirmOrder,
    markOrderPaid,
    startPreparation,
    startProduction,
    startPostProcessing,
    startQualityCheck,
    markReadyToShip,
    shipOrder,
    markDelivered,
    completeOrder,
    cancelOrder,
    disputeOrder,
  })
}

export type OrderService = ReturnType<typeof createOrderService>
