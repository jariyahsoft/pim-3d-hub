/**
 * Mobile seller workspace — order queue, production update, shipment, pause.
 *
 * All state transitions use the same API contracts as the Web app.  Business
 * rules (state machines, permissions, pricing) are enforced server-side; this
 * module only submits commands and renders responses.
 */

import type { ApiClient } from './api-client.js';
import type { AuthClient } from './auth.js';

// ── Types ───────────────────────────────────────────────────────────────

export type SellerOrderItem = Readonly<{
  buyerName: string;
  buyerPhone: string | null;
  createdAt: string;
  itemSummary: string;
  orderId: string;
  orderNumber: string;
  status: string;
  totalMinor: number;
}>;

export type ProductionUpdateInput = Readonly<{
  assetIds?: readonly string[];
  message: string;
  orderId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO';
}>;

export type ShipmentCreateInput = Readonly<{
  carrier: string;
  orderId: string;
  trackingNumber: string;
}>;

export type ActionConfirmation = Readonly<{
  accepted: boolean;
  message: string;
  newStatus: string | null;
}>;

export type EarningsSummary = Readonly<{
  completedOrders: number;
  completedOrdersRevenue: number;
  currentMonthRevenue: number;
  currency: string;
  pendingPayout: number;
  totalLifetimeRevenue: number;
}>;

export type ServiceOrPrinterItem = Readonly<{
  id: string;
  isPrinter: boolean;
  label: string;
  status: string;
}>;

// ── Errors ──────────────────────────────────────────────────────────────

export class SellerActionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'SellerActionError';
  }
}

// ── Ports ──────────────────────────────────────────────────────────────

export type SellerWorkspacePorts = Readonly<{
  apiClient: ApiClient;
  authClient: AuthClient;
}>;

// ── Service ────────────────────────────────────────────────────────────

export type SellerWorkspaceService = Readonly<{
  listOrders(statusFilter?: string): Promise<readonly SellerOrderItem[]>;
  confirmOrder(
    orderId: string,
    expectedVersion: number,
  ): Promise<ActionConfirmation>;
  declineOrder(
    orderId: string,
    expectedVersion: number,
    reason: string,
  ): Promise<ActionConfirmation>;
  submitProductionUpdate(
    input: ProductionUpdateInput,
  ): Promise<ActionConfirmation>;
  createShipment(input: ShipmentCreateInput): Promise<ActionConfirmation>;
  pauseService(
    serviceId: string,
    expectedVersion: number,
  ): Promise<ActionConfirmation>;
  resumeService(
    serviceId: string,
    expectedVersion: number,
  ): Promise<ActionConfirmation>;
  pausePrinter(
    printerId: string,
    expectedVersion: number,
  ): Promise<ActionConfirmation>;
  getEarningsSummary(): Promise<EarningsSummary>;
  listServicesAndPrinters(): Promise<readonly ServiceOrPrinterItem[]>;
}>;

export function createSellerWorkspaceService(
  ports: SellerWorkspacePorts,
): SellerWorkspaceService {
  const api = ports.apiClient;

  async function apiPost<T>(
    path: string,
    body: unknown,
    expectedVersion?: number,
  ): Promise<T> {
    const result = await api.request<T>({
      method: 'POST',
      path,
      body,
      expectedVersion,
    });
    if ('error' in result) {
      throw new SellerActionError(
        result.error.code,
        result.error.message,
        result.error.status,
      );
    }
    return result.data;
  }

  async function apiGet<T>(path: string): Promise<T> {
    const result = await api.request<T>({ method: 'GET', path });
    if ('error' in result) {
      throw new SellerActionError(
        result.error.code,
        result.error.message,
        result.error.status,
      );
    }
    return result.data;
  }

  // ── Order queue ──────────────────────────────────────────────────

  async function listOrders(
    statusFilter?: string,
  ): Promise<readonly SellerOrderItem[]> {
    return apiGet<readonly SellerOrderItem[]>(
      `/api/v1/seller/orders${statusFilter ? `?status=${statusFilter}` : ''}`,
    );
  }

  async function confirmOrder(
    orderId: string,
    expectedVersion: number,
  ): Promise<ActionConfirmation> {
    return apiPost<ActionConfirmation>(
      `/api/v1/seller/orders/${orderId}/confirm`,
      {},
      expectedVersion,
    );
  }

  async function declineOrder(
    orderId: string,
    expectedVersion: number,
    reason: string,
  ): Promise<ActionConfirmation> {
    return apiPost<ActionConfirmation>(
      `/api/v1/seller/orders/${orderId}/decline`,
      { reason },
      expectedVersion,
    );
  }

  // ── Production updates ───────────────────────────────────────────

  async function submitProductionUpdate(
    input: ProductionUpdateInput,
  ): Promise<ActionConfirmation> {
    return apiPost<ActionConfirmation>(
      `/api/v1/seller/orders/${input.orderId}/production`,
      input,
    );
  }

  // ── Shipment ─────────────────────────────────────────────────────

  async function createShipment(
    input: ShipmentCreateInput,
  ): Promise<ActionConfirmation> {
    return apiPost<ActionConfirmation>(
      `/api/v1/seller/orders/${input.orderId}/shipments`,
      input,
    );
  }

  // ── Service / printer pause ──────────────────────────────────────

  async function pauseService(
    serviceId: string,
    expectedVersion: number,
  ): Promise<ActionConfirmation> {
    return apiPost<ActionConfirmation>(
      `/api/v1/seller/services/${serviceId}/pause`,
      {},
      expectedVersion,
    );
  }

  async function resumeService(
    serviceId: string,
    expectedVersion: number,
  ): Promise<ActionConfirmation> {
    return apiPost<ActionConfirmation>(
      `/api/v1/seller/services/${serviceId}/resume`,
      {},
      expectedVersion,
    );
  }

  async function pausePrinter(
    printerId: string,
    expectedVersion: number,
  ): Promise<ActionConfirmation> {
    return apiPost<ActionConfirmation>(
      `/api/v1/seller/printers/${printerId}/pause`,
      {},
      expectedVersion,
    );
  }

  // ── Earnings ─────────────────────────────────────────────────────

  async function getEarningsSummary(): Promise<EarningsSummary> {
    return apiGet<EarningsSummary>('/api/v1/seller/earnings');
  }

  // ── Service / printer listing ────────────────────────────────────

  async function listServicesAndPrinters(): Promise<
    readonly ServiceOrPrinterItem[]
  > {
    return apiGet<readonly ServiceOrPrinterItem[]>(
      '/api/v1/seller/services-and-printers',
    );
  }

  return {
    confirmOrder,
    createShipment,
    declineOrder,
    getEarningsSummary,
    listOrders,
    listServicesAndPrinters,
    pausePrinter,
    pauseService,
    resumeService,
    submitProductionUpdate,
  };
}
