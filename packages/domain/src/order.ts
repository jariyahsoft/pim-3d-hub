import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js'
import type { MoneyMinor, UtcTimestamp, Uuidv7 } from './index.js'

// Order states from database design
export const orderStatuses = [
  'DRAFT',
  'AWAITING_PROVIDER_CONFIRMATION',
  'AWAITING_PAYMENT',
  'PAID',
  'PREPARING',
  'IN_PRODUCTION',
  'POST_PROCESSING',
  'QUALITY_CHECK',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED',
] as const

export type OrderStatus = (typeof orderStatuses)[number]
export type OrderSortField = 'createdAt' | 'updatedAt' | 'orderNumber'

// Order source types
export type OrderSourceType = 'PROPOSAL' | 'INSTANT_QUOTE'

// Order item types
export type OrderItemType = 'SERVICE' | 'MATERIAL' | 'SHIPPING' | 'OTHER'

// Participant roles
export type OrderParticipantRole = 'BUYER' | 'PROVIDER'

// Immutable snapshot of buyer/provider identity at order creation
export type OrderParticipantSnapshot = Readonly<{
  userId: Uuidv7
  displayName: string | null
  email: string | null
  phone: string | null
}>

// Immutable address snapshot
export type OrderAddressSnapshot = Readonly<{
  label: string | null
  fullAddress: string
  city: string | null
  stateProvince: string | null
  postalCode: string | null
  country: string
  latitude: number | null
  longitude: number | null
}>

// Immutable proposal/quote snapshot
export type OrderSourceSnapshot = Readonly<{
  sourceType: OrderSourceType
  sourceId: Uuidv7
  sourceRevisionNumber: number | null
  snapshotData: string // JSON stringified source data
}>

// Order item record
export type OrderItemRecord = Readonly<
  CanonicalRecord & {
    orderId: Uuidv7
    itemType: OrderItemType
    description: string
    quantity: number
    unitPrice: MoneyMinor
    totalPrice: MoneyMinor
    sequence: number
  }
>

export type CreateOrderItemInput = Readonly<{
  createdBy?: Uuidv7 | null
  description: string
  id?: Uuidv7
  itemType: OrderItemType
  orderId: Uuidv7
  quantity: number
  sequence: number
  totalPrice: MoneyMinor
  unitPrice: MoneyMinor
  updatedBy?: Uuidv7 | null
}>

// Order record with immutable snapshots
export type OrderRecord = Readonly<
  CanonicalRecord & {
    orderNumber: string
    buyerUserId: Uuidv7
    providerProfileId: Uuidv7
    serviceRequestId: Uuidv7 | null
    status: OrderStatus
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
  }
>

export type CreateOrderInput = Readonly<{
  buyerSnapshot: OrderParticipantSnapshot
  buyerUserId: Uuidv7
  cancelledAt?: UtcTimestamp | null
  completedAt?: UtcTimestamp | null
  confirmedAt?: UtcTimestamp | null
  createdBy?: Uuidv7 | null
  currency: string
  expectedDeliveryAt?: UtcTimestamp | null
  id?: Uuidv7
  notes?: string | null
  orderNumber: string
  providerProfileId: Uuidv7
  providerSnapshot: OrderParticipantSnapshot
  serviceRequestId?: Uuidv7 | null
  shippingAddressSnapshot?: OrderAddressSnapshot | null
  shippingAmount?: MoneyMinor | null
  sourceSnapshot: OrderSourceSnapshot
  status?: OrderStatus
  subtotal: MoneyMinor
  taxAmount?: MoneyMinor | null
  totalAmount: MoneyMinor
  updatedBy?: Uuidv7 | null
}>

export type OrderFilter = Readonly<{
  buyerUserId?: Uuidv7
  providerProfileId?: Uuidv7
  serviceRequestId?: Uuidv7
  status?: OrderStatus
}>

export type OrderRepository = Readonly<{
  create(input: CreateOrderInput): Promise<OrderRecord>
  findById(
    id: Uuidv7,
    options?: Readonly<{
      includeDeleted?: boolean
    }>,
  ): Promise<OrderRecord | null>
  findByOrderNumber(orderNumber: string): Promise<OrderRecord | null>
  list(
    request: RepositoryListRequest<OrderFilter, OrderSortField>,
  ): Promise<RepositoryListPage<OrderRecord>>
  update(order: OrderRecord, expectedVersion: number): Promise<OrderRecord>
}>

export type OrderItemRepository = Readonly<{
  create(input: CreateOrderItemInput): Promise<OrderItemRecord>
  findById(id: Uuidv7): Promise<OrderItemRecord | null>
  listByOrderId(orderId: Uuidv7): Promise<readonly OrderItemRecord[]>
}>

// Order status event record for audit trail
export type OrderStatusEventRecord = Readonly<
  CanonicalRecord & {
    orderId: Uuidv7
    fromStatus: OrderStatus | null
    toStatus: OrderStatus
    actorUserId: Uuidv7 | null
    reason: string | null
    metadata: Record<string, unknown>
  }
>

export type CreateOrderStatusEventInput = Readonly<{
  actorUserId?: Uuidv7 | null
  createdBy?: Uuidv7 | null
  fromStatus?: OrderStatus | null
  id?: Uuidv7
  metadata?: Record<string, unknown>
  orderId: Uuidv7
  reason?: string | null
  toStatus: OrderStatus
  updatedBy?: Uuidv7 | null
}>

export type OrderStatusEventRepository = Readonly<{
  create(input: CreateOrderStatusEventInput): Promise<OrderStatusEventRecord>
  listByOrderId(orderId: Uuidv7): Promise<readonly OrderStatusEventRecord[]>
}>

// Order milestone statuses
export const orderMilestoneStatuses = [
  'PENDING',
  'SUBMITTED',
  'REVISION_REQUESTED',
  'APPROVED',
] as const

export type OrderMilestoneStatus = (typeof orderMilestoneStatuses)[number]

// Order milestone record
export type OrderMilestoneRecord = Readonly<
  CanonicalRecord & {
    orderId: Uuidv7
    sequence: number
    title: string
    description: string | null
    dueAt: UtcTimestamp | null
    status: OrderMilestoneStatus
    submittedAt: UtcTimestamp | null
    submittedByUserId: Uuidv7 | null
    approvedAt: UtcTimestamp | null
    approvedByUserId: Uuidv7 | null
    revisionRequestedAt: UtcTimestamp | null
    revisionRequestedByUserId: Uuidv7 | null
    revisionNotes: string | null
    revisionCount: number
    deliverableAssetIds: readonly Uuidv7[]
  }
>

export type CreateOrderMilestoneInput = Readonly<{
  approvedAt?: UtcTimestamp | null
  approvedByUserId?: Uuidv7 | null
  createdBy?: Uuidv7 | null
  deliverableAssetIds?: readonly Uuidv7[]
  description?: string | null
  dueAt?: UtcTimestamp | null
  id?: Uuidv7
  orderId: Uuidv7
  revisionCount?: number
  revisionNotes?: string | null
  revisionRequestedAt?: UtcTimestamp | null
  revisionRequestedByUserId?: Uuidv7 | null
  sequence: number
  status?: OrderMilestoneStatus
  submittedAt?: UtcTimestamp | null
  submittedByUserId?: Uuidv7 | null
  title: string
  updatedBy?: Uuidv7 | null
}>

export type OrderMilestoneRepository = Readonly<{
  create(input: CreateOrderMilestoneInput): Promise<OrderMilestoneRecord>
  findById(id: Uuidv7): Promise<OrderMilestoneRecord | null>
  listByOrderId(orderId: Uuidv7): Promise<readonly OrderMilestoneRecord[]>
  update(
    milestone: OrderMilestoneRecord,
    expectedVersion: number,
  ): Promise<OrderMilestoneRecord>
}>

// Order change request types
export const orderChangeRequestTypes = ['SCOPE', 'PRICE', 'SCHEDULE'] as const
export type OrderChangeRequestType = (typeof orderChangeRequestTypes)[number]

export const orderChangeRequestStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const
export type OrderChangeRequestStatus = (typeof orderChangeRequestStatuses)[number]

// Order change request record
export type OrderChangeRequestRecord = Readonly<
  CanonicalRecord & {
    orderId: Uuidv7
    requestType: OrderChangeRequestType
    requestedByUserId: Uuidv7
    title: string
    description: string
    priceAdjustment: MoneyMinor | null
    scheduleAdjustmentDays: number | null
    scopeDetails: string | null
    status: OrderChangeRequestStatus
    approvedAt: UtcTimestamp | null
    approvedByUserId: Uuidv7 | null
    rejectedAt: UtcTimestamp | null
    rejectedByUserId: Uuidv7 | null
    rejectionReason: string | null
  }
>

export type CreateOrderChangeRequestInput = Readonly<{
  approvedAt?: UtcTimestamp | null
  approvedByUserId?: Uuidv7 | null
  createdBy?: Uuidv7 | null
  description: string
  id?: Uuidv7
  orderId: Uuidv7
  priceAdjustment?: MoneyMinor | null
  rejectedAt?: UtcTimestamp | null
  rejectedByUserId?: Uuidv7 | null
  rejectionReason?: string | null
  requestedByUserId: Uuidv7
  requestType: OrderChangeRequestType
  scheduleAdjustmentDays?: number | null
  scopeDetails?: string | null
  status?: OrderChangeRequestStatus
  title: string
  updatedBy?: Uuidv7 | null
}>

export type OrderChangeRequestRepository = Readonly<{
  create(input: CreateOrderChangeRequestInput): Promise<OrderChangeRequestRecord>
  findById(id: Uuidv7): Promise<OrderChangeRequestRecord | null>
  listByOrderId(orderId: Uuidv7): Promise<readonly OrderChangeRequestRecord[]>
  update(
    changeRequest: OrderChangeRequestRecord,
    expectedVersion: number,
  ): Promise<OrderChangeRequestRecord>
}>

// Order production update types
export const orderProductionUpdateTypes = [
  'PROGRESS',
  'ISSUE',
  'MILESTONE_EVIDENCE',
  'QUALITY_CHECK',
  'OTHER',
] as const
export type OrderProductionUpdateType = (typeof orderProductionUpdateTypes)[number]

// Order production update record
export type OrderProductionUpdateRecord = Readonly<
  CanonicalRecord & {
    orderId: Uuidv7
    updateType: OrderProductionUpdateType
    postedByUserId: Uuidv7
    occurredAt: UtcTimestamp
    title: string
    description: string | null
    mediaAssetIds: readonly Uuidv7[]
  }
>

export type CreateOrderProductionUpdateInput = Readonly<{
  createdBy?: Uuidv7 | null
  description?: string | null
  id?: Uuidv7
  mediaAssetIds?: readonly Uuidv7[]
  occurredAt: UtcTimestamp
  orderId: Uuidv7
  postedByUserId: Uuidv7
  title: string
  updateType: OrderProductionUpdateType
  updatedBy?: Uuidv7 | null
}>

export type OrderProductionUpdateRepository = Readonly<{
  create(input: CreateOrderProductionUpdateInput): Promise<OrderProductionUpdateRecord>
  findById(id: Uuidv7): Promise<OrderProductionUpdateRecord | null>
  listByOrderId(orderId: Uuidv7): Promise<readonly OrderProductionUpdateRecord[]>
}>
