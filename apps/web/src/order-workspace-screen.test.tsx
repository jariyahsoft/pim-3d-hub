import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderWorkspaceScreen, OrderListScreen } from './order-workspace-screen.js'
import { createMoneyMinor, parseUuidv7, parseUtcTimestamp } from '@pim/domain'
import type { OrderDto } from '@pim/application'

const createTestOrder = (overrides?: Partial<OrderDto>): OrderDto => ({
  id: parseUuidv7('01234567-89ab-7000-8000-000000000001'),
  orderNumber: 'ORD-20260628-00001',
  buyerUserId: parseUuidv7('01234567-89ab-7000-8000-000000000010'),
  providerProfileId: parseUuidv7('01234567-89ab-7000-8000-000000000020'),
  serviceRequestId: null,
  status: 'IN_PRODUCTION',
  currency: 'USD',
  subtotal: createMoneyMinor(10000),
  taxAmount: null,
  shippingAmount: null,
  totalAmount: createMoneyMinor(10000),
  buyerSnapshot: {
    userId: parseUuidv7('01234567-89ab-7000-8000-000000000010'),
    displayName: 'Test Buyer',
    email: 'buyer@test.com',
    phone: null,
  },
  providerSnapshot: {
    userId: parseUuidv7('01234567-89ab-7000-8000-000000000020'),
    displayName: 'Test Provider',
    email: 'provider@test.com',
    phone: null,
  },
  shippingAddressSnapshot: null,
  sourceSnapshot: {
    sourceType: 'PROPOSAL',
    sourceId: parseUuidv7('01234567-89ab-7000-8000-000000000030'),
    sourceRevisionNumber: 1,
    snapshotData: '{}',
  },
  notes: null,
  expectedDeliveryAt: null,
  confirmedAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
  cancelledAt: null,
  completedAt: null,
  version: 1,
  ...overrides,
})

describe('OrderWorkspaceScreen', () => {
  it('renders order header with order number and status', () => {
    const order = createTestOrder()
    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="buyer"
      />
    )

    expect(screen.getByText('ORD-20260628-00001')).toBeInTheDocument()
    expect(screen.getByText('IN PRODUCTION')).toBeInTheDocument()
  })

  it('renders buyer and provider information', () => {
    const order = createTestOrder()
    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="buyer"
      />
    )

    expect(screen.getByText(/Buyer: Test Buyer/)).toBeInTheDocument()
    expect(screen.getByText(/Provider: Test Provider/)).toBeInTheDocument()
  })

  it('renders total amount', () => {
    const order = createTestOrder()
    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="buyer"
      />
    )

    expect(screen.getByText(/Total: USD 100.00/)).toBeInTheDocument()
  })

  it('shows buyer-specific actions for delivered order', () => {
    const order = createTestOrder({ status: 'DELIVERED' })
    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="buyer"
      />
    )

    // Click Actions tab
    screen.getByText('Actions').click()

    expect(screen.getByText('Mark as Complete')).toBeInTheDocument()
    expect(screen.getByText('Open Dispute')).toBeInTheDocument()
  })

  it('shows provider-specific actions for paid order', () => {
    const order = createTestOrder({ status: 'PAID' })
    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="provider"
      />
    )

    // Click Actions tab
    screen.getByText('Actions').click()

    expect(screen.getByText('Start Preparation')).toBeInTheDocument()
  })

  it('shows no actions message when no actions available', () => {
    const order = createTestOrder({ status: 'COMPLETED' })
    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="buyer"
      />
    )

    // Click Actions tab
    screen.getByText('Actions').click()

    expect(screen.getByText('No actions available at this time')).toBeInTheDocument()
  })

  it('renders timeline events', () => {
    const order = createTestOrder()
    const timeline = [
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
        title: 'Production Started',
        description: null,
        actorRole: 'provider' as const,
        eventType: 'status_change' as const,
      },
    ]

    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={timeline}
        userRole="buyer"
      />
    )

    // Click Timeline tab
    screen.getByText('Timeline').click()

    expect(screen.getByText('Order Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Provider confirmed the order')).toBeInTheDocument()
    expect(screen.getByText('Production Started')).toBeInTheDocument()
  })

  it('renders order details tab with pricing breakdown', () => {
    const order = createTestOrder({
      subtotal: createMoneyMinor(10000),
      taxAmount: createMoneyMinor(800),
      shippingAmount: createMoneyMinor(500),
      totalAmount: createMoneyMinor(11300),
    })

    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="buyer"
      />
    )

    expect(screen.getByText(/Subtotal:/)).toBeInTheDocument()
    expect(screen.getByText(/Tax:/)).toBeInTheDocument()
    expect(screen.getByText(/Shipping:/)).toBeInTheDocument()
  })

  it('renders notes when present', () => {
    const order = createTestOrder({
      notes: 'Please use red PLA filament',
    })

    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="buyer"
      />
    )

    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Please use red PLA filament')).toBeInTheDocument()
  })

  it('renders expected delivery date when present', () => {
    const order = createTestOrder({
      expectedDeliveryAt: parseUtcTimestamp('2026-07-05T00:00:00.000Z'),
    })

    render(
      <OrderWorkspaceScreen
        order={order}
        timeline={[]}
        userRole="buyer"
      />
    )

    expect(screen.getByText('Expected Delivery')).toBeInTheDocument()
  })

  it('displays correct status colors', () => {
    const testStatuses = [
      { status: 'COMPLETED', colorClass: 'text-emerald-700 bg-emerald-100' },
      { status: 'CANCELLED', colorClass: 'text-gray-700 bg-gray-100' },
      { status: 'DISPUTED', colorClass: 'text-red-700 bg-red-100' },
    ]

    testStatuses.forEach(({ status }) => {
      const order = createTestOrder({ status })
      const { container } = render(
        <OrderWorkspaceScreen
          order={order}
          timeline={[]}
          userRole="buyer"
        />
      )
      expect(container.querySelector(`[class*="bg-"]`)).toBeInTheDocument()
    })
  })
})

describe('OrderListScreen', () => {
  it('renders empty state when no orders', () => {
    render(
      <OrderListScreen
        orders={[]}
        userRole="buyer"
      />
    )

    expect(screen.getByText('No orders yet')).toBeInTheDocument()
  })

  it('renders list of orders for buyer', () => {
    const orders = [
      createTestOrder({
        id: parseUuidv7('01234567-89ab-7000-8000-000000000001'),
        orderNumber: 'ORD-20260628-00001',
      }),
      createTestOrder({
        id: parseUuidv7('01234567-89ab-7000-8000-000000000002'),
        orderNumber: 'ORD-20260628-00002',
        status: 'SHIPPED',
      }),
    ]

    render(
      <OrderListScreen
        orders={orders}
        userRole="buyer"
      />
    )

    expect(screen.getByText('ORD-20260628-00001')).toBeInTheDocument()
    expect(screen.getByText('ORD-20260628-00002')).toBeInTheDocument()
    expect(screen.getAllByText(/Provider: Test Provider/).length).toBe(2)
  })

  it('renders list of orders for provider', () => {
    const orders = [
      createTestOrder({
        orderNumber: 'ORD-20260628-00001',
      }),
    ]

    render(
      <OrderListScreen
        orders={orders}
        userRole="provider"
      />
    )

    expect(screen.getByText(/Buyer: Test Buyer/)).toBeInTheDocument()
  })

  it('displays order status badges', () => {
    const orders = [
      createTestOrder({ status: 'IN_PRODUCTION' }),
      createTestOrder({
        id: parseUuidv7('01234567-89ab-7000-8000-000000000002'),
        status: 'COMPLETED',
        orderNumber: 'ORD-20260628-00002',
      }),
    ]

    render(
      <OrderListScreen
        orders={orders}
        userRole="buyer"
      />
    )

    expect(screen.getByText('IN PRODUCTION')).toBeInTheDocument()
    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
  })

  it('displays order total amounts', () => {
    const orders = [
      createTestOrder({ totalAmount: createMoneyMinor(15000) }),
    ]

    render(
      <OrderListScreen
        orders={orders}
        userRole="buyer"
      />
    )

    expect(screen.getByText(/USD 150.00/)).toBeInTheDocument()
  })
})
