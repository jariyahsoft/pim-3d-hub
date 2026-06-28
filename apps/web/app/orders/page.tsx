import { OrderWorkspaceScreen, OrderListScreen } from '../../../src/order-workspace-screen.js'
import { createMoneyMinor, parseUuidv7, parseUtcTimestamp } from '@pim/domain'
import type { OrderDto } from '@pim/application'

const demoOrders: OrderDto[] = [
  {
    id: parseUuidv7('01234567-89ab-7000-8000-000000000001'),
    orderNumber: 'ORD-20260628-00001',
    buyerUserId: parseUuidv7('01234567-89ab-7000-8000-000000000010'),
    providerProfileId: parseUuidv7('01234567-89ab-7000-8000-000000000020'),
    serviceRequestId: null,
    status: 'IN_PRODUCTION',
    currency: 'USD',
    subtotal: createMoneyMinor(10000),
    taxAmount: createMoneyMinor(800),
    shippingAmount: createMoneyMinor(500),
    totalAmount: createMoneyMinor(11300),
    buyerSnapshot: {
      userId: parseUuidv7('01234567-89ab-7000-8000-000000000010'),
      displayName: 'Demo Buyer',
      email: 'buyer@demo.com',
      phone: null,
    },
    providerSnapshot: {
      userId: parseUuidv7('01234567-89ab-7000-8000-000000000020'),
      displayName: 'Demo Provider',
      email: 'provider@demo.com',
      phone: null,
    },
    shippingAddressSnapshot: null,
    sourceSnapshot: {
      sourceType: 'PROPOSAL',
      sourceId: parseUuidv7('01234567-89ab-7000-8000-000000000030'),
      sourceRevisionNumber: 1,
      snapshotData: '{}',
    },
    notes: 'Please use high quality PLA filament',
    expectedDeliveryAt: parseUtcTimestamp('2026-07-05T00:00:00.000Z'),
    confirmedAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
    cancelledAt: null,
    completedAt: null,
    version: 1,
  },
  {
    id: parseUuidv7('01234567-89ab-7000-8000-000000000002'),
    orderNumber: 'ORD-20260627-00001',
    buyerUserId: parseUuidv7('01234567-89ab-7000-8000-000000000010'),
    providerProfileId: parseUuidv7('01234567-89ab-7000-8000-000000000020'),
    serviceRequestId: null,
    status: 'SHIPPED',
    currency: 'USD',
    subtotal: createMoneyMinor(5000),
    taxAmount: null,
    shippingAmount: createMoneyMinor(300),
    totalAmount: createMoneyMinor(5300),
    buyerSnapshot: {
      userId: parseUuidv7('01234567-89ab-7000-8000-000000000010'),
      displayName: 'Demo Buyer',
      email: 'buyer@demo.com',
      phone: null,
    },
    providerSnapshot: {
      userId: parseUuidv7('01234567-89ab-7000-8000-000000000020'),
      displayName: 'Demo Provider',
      email: 'provider@demo.com',
      phone: null,
    },
    shippingAddressSnapshot: null,
    sourceSnapshot: {
      sourceType: 'INSTANT_QUOTE',
      sourceId: parseUuidv7('01234567-89ab-7000-8000-000000000031'),
      sourceRevisionNumber: null,
      snapshotData: '{}',
    },
    notes: null,
    expectedDeliveryAt: parseUtcTimestamp('2026-06-30T00:00:00.000Z'),
    confirmedAt: parseUtcTimestamp('2026-06-27T09:00:00.000Z'),
    cancelledAt: null,
    completedAt: null,
    version: 1,
  },
]

const demoTimeline = [
  {
    id: '1',
    timestamp: '2026-06-28T10:00:00.000Z',
    title: 'Order Confirmed',
    description: 'Provider confirmed the order',
    actorRole: 'provider' as const,
    eventType: 'status_change' as const,
  },
  {
    id: '2',
    timestamp: '2026-06-28T11:00:00.000Z',
    title: 'Payment Captured',
    description: 'Payment of $113.00 captured successfully',
    actorRole: 'system' as const,
    eventType: 'status_change' as const,
  },
  {
    id: '3',
    timestamp: '2026-06-28T12:00:00.000Z',
    title: 'Production Started',
    description: 'Provider started production',
    actorRole: 'provider' as const,
    eventType: 'status_change' as const,
  },
  {
    id: '4',
    timestamp: '2026-06-28T13:30:00.000Z',
    title: 'Production Update',
    description: 'Printing progress: 50% complete',
    actorRole: 'provider' as const,
    eventType: 'production_update' as const,
  },
]

export default function OrdersPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Order List (Buyer View)</h2>
        <OrderListScreen
          orders={demoOrders}
          userRole="buyer"
          onSelectOrder={(id) => console.log('Selected order:', id)}
        />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Workspace (Buyer View)</h2>
        <OrderWorkspaceScreen
          order={demoOrders[0]}
          timeline={demoTimeline}
          userRole="buyer"
          onAction={(action, orderId) => console.log('Action:', action, 'Order:', orderId)}
        />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Workspace (Provider View)</h2>
        <OrderWorkspaceScreen
          order={demoOrders[0]}
          timeline={demoTimeline}
          userRole="provider"
          onAction={(action, orderId) => console.log('Action:', action, 'Order:', orderId)}
        />
      </div>
    </div>
  )
}
