import {
  AuthorizationDeniedError as AuthzDenied,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js'

// Re-export for use in tests and API
export { AuthorizationDeniedError } from './identity.js'

import {
  parseUtcTimestamp,
  type CreateOrderProductionUpdateInput,
  type OrderProductionUpdateRecord,
  type OrderProductionUpdateRepository,
  type OrderProductionUpdateType,
  type OrderRepository,
  type ProviderProfileRepository,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type OrderProductionUpdateDto = Readonly<{
  id: Uuidv7
  orderId: Uuidv7
  updateType: OrderProductionUpdateType
  postedByUserId: Uuidv7
  occurredAt: UtcTimestamp
  title: string
  description: string | null
  mediaAssetIds: readonly Uuidv7[]
}>

export type CreateProductionUpdateCommand = Readonly<{
  actorUserId: Uuidv7
  orderId: Uuidv7
  updateType: OrderProductionUpdateType
  occurredAt: UtcTimestamp
  title: string
  description?: string | null
  mediaAssetIds?: readonly Uuidv7[]
}>

export class InvalidProductionUpdateError extends Error {
  readonly code = 'VALIDATION_ERROR'
  readonly fields: readonly string[]
  readonly status = 400

  constructor(message: string, fields: readonly string[] = []) {
    super(message)
    this.name = 'InvalidProductionUpdateError'
    this.fields = fields
  }
}

export type OrderProductionUpdateServicePorts = Readonly<{
  clock: ClockPort
  uuidGenerator: UuidGeneratorPort
  orderRepository: OrderRepository
  orderProductionUpdateRepository: OrderProductionUpdateRepository
  providerProfileRepository: ProviderProfileRepository
}>

export function createOrderProductionUpdateService(
  ports: OrderProductionUpdateServicePorts,
) {
  const {
    clock,
    uuidGenerator,
    orderRepository,
    orderProductionUpdateRepository,
    providerProfileRepository,
  } = ports

  function toDto(update: OrderProductionUpdateRecord): OrderProductionUpdateDto {
    return {
      id: update.id,
      orderId: update.orderId,
      updateType: update.updateType,
      postedByUserId: update.postedByUserId,
      occurredAt: update.occurredAt,
      title: update.title,
      description: update.description,
      mediaAssetIds: update.mediaAssetIds,
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

  async function createProductionUpdate(
    command: CreateProductionUpdateCommand,
  ): Promise<OrderProductionUpdateDto> {
    const order = await orderRepository.findById(command.orderId)
    if (!order) {
      throw new Error(`Order ${command.orderId} not found`)
    }

    // Verify actor is provider
    await verifyProviderAccess(command.actorUserId, order.providerProfileId)

    // Verify order is in a production lifecycle stage
    const productionStates = [
      'PAID',
      'PREPARING',
      'IN_PRODUCTION',
      'POST_PROCESSING',
      'QUALITY_CHECK',
      'READY_TO_SHIP',
      'SHIPPED',
    ]

    if (!productionStates.includes(order.status)) {
      throw new InvalidProductionUpdateError(
        `Cannot post production update for order with status ${order.status}`,
        ['orderId'],
      )
    }

    // Verify occurredAt is not in the future
    const now = clock.now()
    if (command.occurredAt > now) {
      throw new InvalidProductionUpdateError(
        'Production update occurredAt cannot be in the future',
        ['occurredAt'],
      )
    }

    const input: CreateOrderProductionUpdateInput = {
      id: uuidGenerator.next(),
      orderId: command.orderId,
      updateType: command.updateType,
      postedByUserId: command.actorUserId,
      occurredAt: command.occurredAt,
      title: command.title,
      description: command.description ?? null,
      mediaAssetIds: command.mediaAssetIds ?? [],
      createdBy: command.actorUserId,
    }

    const update = await orderProductionUpdateRepository.create(input)
    return toDto(update)
  }

  async function getProductionUpdate(
    actorUserId: Uuidv7,
    updateId: Uuidv7,
  ): Promise<OrderProductionUpdateDto> {
    const update = await orderProductionUpdateRepository.findById(updateId)
    if (!update) {
      throw new Error(`Production update ${updateId} not found`)
    }

    // Verify order access
    const order = await orderRepository.findById(update.orderId)
    if (!order) {
      throw new Error(`Order ${update.orderId} not found`)
    }

    const providerProfile = await providerProfileRepository.findById(
      order.providerProfileId,
    )
    if (
      order.buyerUserId !== actorUserId &&
      providerProfile?.ownerUserId !== actorUserId
    ) {
      throw new AuthzDenied('Only buyer or provider can view production updates')
    }

    return toDto(update)
  }

  async function listProductionUpdates(
    actorUserId: Uuidv7,
    orderId: Uuidv7,
  ): Promise<readonly OrderProductionUpdateDto[]> {
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
      throw new AuthzDenied('Only buyer or provider can view production updates')
    }

    const updates = await orderProductionUpdateRepository.listByOrderId(orderId)
    return updates.map(toDto)
  }

  return Object.freeze({
    createProductionUpdate,
    getProductionUpdate,
    listProductionUpdates,
  })
}

export type OrderProductionUpdateService = ReturnType<
  typeof createOrderProductionUpdateService
>
