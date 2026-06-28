import type { UtcTimestamp, Uuidv7 } from '@pim/domain'

// Shipping methods
export const shippingMethods = ['PARCEL', 'PICKUP', 'LOCAL_DELIVERY'] as const
export type ShippingMethod = (typeof shippingMethods)[number]

// Shipment statuses
export const shipmentStatuses = [
  'DRAFT',
  'DISPATCHED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RETURNED',
] as const
export type ShipmentStatus = (typeof shipmentStatuses)[number]

// Address snapshot (immutable at shipment creation)
export type ShipmentAddressSnapshot = Readonly<{
  recipientName: string
  addressLine1: string
  addressLine2: string | null
  city: string
  stateProvince: string | null
  postalCode: string
  country: string
  phone: string | null
  email: string | null
}>

// Shipment record
export type ShipmentRecord = Readonly<{
  id: Uuidv7
  orderId: Uuidv7
  method: ShippingMethod
  status: ShipmentStatus
  addressSnapshot: ShipmentAddressSnapshot | null
  carrierName: string | null
  trackingNumber: string | null
  labelUrl: string | null
  estimatedDeliveryAt: UtcTimestamp | null
  dispatchedAt: UtcTimestamp | null
  deliveredAt: UtcTimestamp | null
  failedAt: UtcTimestamp | null
  failureReason: string | null
  version: number
  createdAt: UtcTimestamp
  updatedAt: UtcTimestamp
  createdBy: Uuidv7 | null
  updatedBy: Uuidv7 | null
  deletedAt: UtcTimestamp | null
}>

export type CreateShipmentInput = Readonly<{
  id?: Uuidv7
  orderId: Uuidv7
  method: ShippingMethod
  status?: ShipmentStatus
  addressSnapshot?: ShipmentAddressSnapshot | null
  carrierName?: string | null
  trackingNumber?: string | null
  labelUrl?: string | null
  estimatedDeliveryAt?: UtcTimestamp | null
  dispatchedAt?: UtcTimestamp | null
  deliveredAt?: UtcTimestamp | null
  failedAt?: UtcTimestamp | null
  failureReason?: string | null
  createdBy?: Uuidv7 | null
  updatedBy?: Uuidv7 | null
}>

export type ShipmentRepository = Readonly<{
  create(input: CreateShipmentInput): Promise<ShipmentRecord>
  findById(id: Uuidv7): Promise<ShipmentRecord | null>
  findByOrderId(orderId: Uuidv7): Promise<ShipmentRecord | null>
  update(shipment: ShipmentRecord, expectedVersion: number): Promise<ShipmentRecord>
}>

// Shipment event for tracking timeline
export type ShipmentEventRecord = Readonly<{
  id: Uuidv7
  shipmentId: Uuidv7
  status: ShipmentStatus
  description: string
  location: string | null
  occurredAt: UtcTimestamp
  carrierEventId: string | null
  version: number
  createdAt: UtcTimestamp
  updatedAt: UtcTimestamp
  createdBy: Uuidv7 | null
  updatedBy: Uuidv7 | null
  deletedAt: UtcTimestamp | null
}>

export type CreateShipmentEventInput = Readonly<{
  id?: Uuidv7
  shipmentId: Uuidv7
  status: ShipmentStatus
  description: string
  location?: string | null
  occurredAt: UtcTimestamp
  carrierEventId?: string | null
  createdBy?: Uuidv7 | null
  updatedBy?: Uuidv7 | null
}>

export type ShipmentEventRepository = Readonly<{
  create(input: CreateShipmentEventInput): Promise<ShipmentEventRecord>
  findByCarrierEventId(carrierEventId: string): Promise<ShipmentEventRecord | null>
  listByShipmentId(shipmentId: Uuidv7): Promise<readonly ShipmentEventRecord[]>
}>
