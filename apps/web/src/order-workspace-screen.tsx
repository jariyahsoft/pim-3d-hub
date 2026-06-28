'use client'

import { useState, type ReactElement } from 'react'
import type { OrderDto } from '@pim/application'
import type { Uuidv7 } from '@pim/domain'

type OrderTimelineEvent = Readonly<{
  id: string
  timestamp: string
  title: string
  description: string | null
  actorRole: 'buyer' | 'provider' | 'system'
  eventType: 'status_change' | 'milestone' | 'production_update' | 'change_request'
}>

type OrderWorkspaceProps = Readonly<{
  order: OrderDto
  timeline: readonly OrderTimelineEvent[]
  userRole: 'buyer' | 'provider'
  onAction?: (action: string, orderId: Uuidv7) => void
}>

type BuyerActionType =
  | 'complete'
  | 'approve_change_request'
  | 'approve_milestone'
  | 'request_milestone_revision'
  | 'create_change_request'
  | 'cancel'
  | 'dispute'

type ProviderActionType =
  | 'confirm'
  | 'start_preparation'
  | 'start_production'
  | 'start_post_processing'
  | 'start_quality_check'
  | 'mark_ready_to_ship'
  | 'ship'
  | 'submit_milestone'
  | 'post_production_update'
  | 'approve_change_request'
  | 'cancel'

function getAllowedBuyerActions(status: string): readonly BuyerActionType[] {
  switch (status) {
    case 'DELIVERED':
      return ['complete', 'dispute']
    case 'SHIPPED':
      return ['dispute']
    case 'IN_PRODUCTION':
    case 'POST_PROCESSING':
    case 'QUALITY_CHECK':
      return ['dispute']
    case 'AWAITING_PROVIDER_CONFIRMATION':
    case 'AWAITING_PAYMENT':
      return ['cancel']
    default:
      return []
  }
}

function getAllowedProviderActions(status: string): readonly ProviderActionType[] {
  switch (status) {
    case 'AWAITING_PROVIDER_CONFIRMATION':
      return ['confirm', 'cancel']
    case 'PAID':
      return ['start_preparation']
    case 'PREPARING':
      return ['start_production']
    case 'IN_PRODUCTION':
      return ['start_post_processing', 'post_production_update']
    case 'POST_PROCESSING':
      return ['start_quality_check', 'post_production_update']
    case 'QUALITY_CHECK':
      return ['mark_ready_to_ship', 'post_production_update']
    case 'READY_TO_SHIP':
      return ['ship']
    default:
      return []
  }
}

function formatActionLabel(action: BuyerActionType | ProviderActionType): string {
  const labels: Record<string, string> = {
    complete: 'Mark as Complete',
    confirm: 'Confirm Order',
    start_preparation: 'Start Preparation',
    start_production: 'Start Production',
    start_post_processing: 'Start Post-Processing',
    start_quality_check: 'Start Quality Check',
    mark_ready_to_ship: 'Mark Ready to Ship',
    ship: 'Mark as Shipped',
    submit_milestone: 'Submit Milestone',
    approve_milestone: 'Approve Milestone',
    request_milestone_revision: 'Request Revision',
    post_production_update: 'Post Update',
    create_change_request: 'Request Change',
    approve_change_request: 'Approve Change',
    cancel: 'Cancel Order',
    dispute: 'Open Dispute',
  }
  return labels[action] ?? action
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    AWAITING_PROVIDER_CONFIRMATION: 'text-yellow-700 bg-yellow-100',
    AWAITING_PAYMENT: 'text-amber-700 bg-amber-100',
    PAID: 'text-blue-700 bg-blue-100',
    PREPARING: 'text-indigo-700 bg-indigo-100',
    IN_PRODUCTION: 'text-purple-700 bg-purple-100',
    POST_PROCESSING: 'text-violet-700 bg-violet-100',
    QUALITY_CHECK: 'text-cyan-700 bg-cyan-100',
    READY_TO_SHIP: 'text-teal-700 bg-teal-100',
    SHIPPED: 'text-blue-700 bg-blue-100',
    DELIVERED: 'text-green-700 bg-green-100',
    COMPLETED: 'text-emerald-700 bg-emerald-100',
    CANCELLED: 'text-gray-700 bg-gray-100',
    DISPUTED: 'text-red-700 bg-red-100',
  }
  return colors[status] ?? 'text-gray-700 bg-gray-100'
}

function OrderHeader({ order }: { order: OrderDto }): ReactElement {
  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>
      <div className="text-sm text-gray-600">
        <div>Buyer: {order.buyerSnapshot.displayName ?? order.buyerSnapshot.email}</div>
        <div>Provider: {order.providerSnapshot.displayName ?? order.providerSnapshot.email}</div>
        <div className="font-semibold mt-2">
          Total: {order.currency} {(Number(order.totalAmount) / 100).toFixed(2)}
        </div>
      </div>
    </div>
  )
}

function OrderTimeline({ timeline }: { timeline: readonly OrderTimelineEvent[] }): ReactElement {
  if (timeline.length === 0) {
    return <div className="text-gray-500 text-center py-8">No timeline events yet</div>
  }

  return (
    <div className="space-y-4">
      {timeline.map((event) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <div className="font-medium">{event.title}</div>
              <div className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString()}</div>
            </div>
            {event.description && <div className="text-sm text-gray-600 mt-1">{event.description}</div>}
            <div className="text-xs text-gray-500 mt-1">By: {event.actorRole}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function OrderActions({
  order,
  userRole,
  onAction,
}: {
  order: OrderDto
  userRole: 'buyer' | 'provider'
  onAction?: (action: string, orderId: Uuidv7) => void
}): ReactElement {
  const allowedActions = userRole === 'buyer'
    ? getAllowedBuyerActions(order.status)
    : getAllowedProviderActions(order.status)

  if (allowedActions.length === 0) {
    return <div className="text-gray-500 text-center py-4">No actions available at this time</div>
  }

  return (
    <div className="space-y-2">
      {allowedActions.map((action) => (
        <button
          key={action}
          onClick={() => onAction?.(action, order.id)}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {formatActionLabel(action)}
        </button>
      ))}
    </div>
  )
}

export function OrderWorkspaceScreen({
  order,
  timeline,
  userRole,
  onAction,
}: OrderWorkspaceProps): ReactElement {
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'actions'>('details')

  return (
    <div className="max-w-4xl mx-auto p-4">
      <OrderHeader order={order} />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'details'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'timeline'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'actions'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Actions
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Order Details</h3>
              <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                <div><span className="font-medium">Subtotal:</span> {order.currency} {(Number(order.subtotal) / 100).toFixed(2)}</div>
                {order.taxAmount && <div><span className="font-medium">Tax:</span> {order.currency} {(Number(order.taxAmount) / 100).toFixed(2)}</div>}
                {order.shippingAmount && <div><span className="font-medium">Shipping:</span> {order.currency} {(Number(order.shippingAmount) / 100).toFixed(2)}</div>}
                <div className="font-semibold pt-2 border-t">
                  <span>Total:</span> {order.currency} {(Number(order.totalAmount) / 100).toFixed(2)}
                </div>
              </div>
            </div>
            {order.notes && (
              <div>
                <h3 className="font-medium mb-2">Notes</h3>
                <div className="bg-gray-50 p-4 rounded text-sm">{order.notes}</div>
              </div>
            )}
            {order.expectedDeliveryAt && (
              <div>
                <h3 className="font-medium mb-2">Expected Delivery</h3>
                <div className="text-sm">{new Date(order.expectedDeliveryAt).toLocaleDateString()}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && <OrderTimeline timeline={timeline} />}

        {activeTab === 'actions' && (
          <OrderActions order={order} userRole={userRole} onAction={onAction} />
        )}
      </div>
    </div>
  )
}

export function OrderListScreen({
  orders,
  userRole,
  onSelectOrder,
}: {
  orders: readonly OrderDto[]
  userRole: 'buyer' | 'provider'
  onSelectOrder?: (orderId: Uuidv7) => void
}): ReactElement {
  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">Orders</h1>
        <div className="text-gray-500 text-center py-12">No orders yet</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => onSelectOrder?.(order.id)}
            className="w-full text-left p-4 border border-gray-200 rounded hover:bg-gray-50"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{order.orderNumber}</div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {order.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {userRole === 'buyer'
                ? `Provider: ${order.providerSnapshot.displayName ?? 'Unknown'}`
                : `Buyer: ${order.buyerSnapshot.displayName ?? 'Unknown'}`
              }
            </div>
            <div className="text-sm font-semibold mt-2">
              {order.currency} {(Number(order.totalAmount) / 100).toFixed(2)}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
