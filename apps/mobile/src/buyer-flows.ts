/**
 * Core buyer flows for the mobile app.
 *
 * This module defines the screen-level data structures, state enumerations,
 * and status labels for every screen in the buyer journey.
 *
 * Business logic is NEVER duplicated here — all pricing, eligibility, state
 * machines, and permissions are enforced server-side through the API client.
 */

// ── Flow state labels (Thai, used in UX) ──────────────────────────────────

export const SCREEN_LABELS = Object.freeze({
  HOME: 'หน้าหลัก',
  EXPLORE: 'สำรวจ',
  CREATE_REQUEST: 'สร้างงาน',
  UPLOAD: 'อัปโหลดไฟล์',
  CHECK_PRICE: 'เช็คราคา',
  COMPARE_QUOTES: 'เปรียบเทียบราคา',
  CHECKOUT: 'ชำระเงิน',
  ORDER_TRACKING: 'ติดตามคำสั่งซื้อ',
  PROFILE: 'โปรไฟล์',
  LOGIN: 'เข้าสู่ระบบ',
  NOTIFICATIONS: 'การแจ้งเตือน',
  SAVED: 'รายการบันทึก',
  MESSAGES: 'ข้อความ',
} as const);

// ── UI state flavors ──────────────────────────────────────────────────────

export type ScreenState =
  | 'LOADING'
  | 'LOADED'
  | 'OFFLINE'
  | 'ERROR'
  | 'EMPTY'
  | 'EXPIRED'
  | 'CONFLICT'
  | 'FORBIDDEN';

export const SCREEN_STATE_LABELS: Record<ScreenState, string> = Object.freeze({
  LOADING: 'กำลังโหลด...',
  LOADED: '',
  OFFLINE: 'ไม่มีการเชื่อมต่อเครือข่าย',
  ERROR: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
  EMPTY: 'ไม่มีข้อมูล',
  EXPIRED: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
  CONFLICT: 'ข้อมูลมีการเปลี่ยนแปลง กรุณาโหลดใหม่',
  FORBIDDEN: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้',
});

// ── Screen state wrapper ──────────────────────────────────────────────────

export type ScreenStateWrapper<T = unknown> = Readonly<{
  data: T | null;
  errorMessage?: string | null;
  state: ScreenState;
}>;

export function loadingState<T>(): ScreenStateWrapper<T> {
  return { data: null, state: 'LOADING' };
}

export function loadedState<T>(data: T): ScreenStateWrapper<T> {
  return { data, state: 'LOADED' };
}

export function offlineState<T>(errorMessage?: string): ScreenStateWrapper<T> {
  return { data: null, errorMessage, state: 'OFFLINE' };
}

export function errorState<T>(errorMessage?: string): ScreenStateWrapper<T> {
  return {
    data: null,
    errorMessage: errorMessage ?? SCREEN_STATE_LABELS.ERROR,
    state: 'ERROR',
  };
}

export function expiredState<T>(errorMessage?: string): ScreenStateWrapper<T> {
  return {
    data: null,
    errorMessage: errorMessage ?? SCREEN_STATE_LABELS.EXPIRED,
    state: 'EXPIRED',
  };
}

// ── Flow type definitions ─────────────────────────────────────────────────

export type MobileHomeItem = Readonly<{
  /** Provider trust projection card or featured promotion. */
  id: string;
  label: string;
  subtitle: string;
  type: 'PROVIDER' | 'PROMOTION' | 'RECENT_ORDER' | 'FEED_POST';
}>;

export type MobileUploadDraft = Readonly<{
  currentState:
    | 'idle'
    | 'preparing'
    | 'uploading'
    | 'paused'
    | 'offline'
    | 'verifying'
    | 'scanning'
    | 'ready'
    | 'rejected'
    | 'failed';
  errorMessage: string | null;
  filename: string;
  fileSize: number;
  progress: number;
}>;

export type MobileQuoteCard = Readonly<{
  expired: boolean;
  id: string;
  lineItems: ReadonlyArray<{ code: string; amountMinor: number }>;
  providerName: string;
  totalMinor: number;
}>;

export type MobileOrderTracking = Readonly<{
  currentStatus: string;
  events: ReadonlyArray<{
    description: string;
    status: string;
    timestamp: string;
  }>;
  orderId: string;
  orderNumber: string;
  statusLabel: string;
  totalMinor: number;
}>;

export type MobileStatusLabelMap = Readonly<Record<string, string>>;

/**
 * Order status labels in Thai (mirrors the server-side status machine).
 * These are UI labels only — the business status values come from the API.
 */
export const ORDER_STATUS_LABELS: MobileStatusLabelMap = Object.freeze({
  DRAFT: 'ร่าง',
  PENDING_PAYMENT: 'รอชำระเงิน',
  PAID: 'ชำระแล้ว',
  FULFILLING: 'กำลังดำเนินการ',
  SHIPPED: 'จัดส่งแล้ว',
  DELIVERED: 'ได้รับแล้ว',
  COMPLETED: 'เสร็จสมบูรณ์',
  CANCELLED: 'ยกเลิก',
  REFUNDED: 'คืนเงินแล้ว',
});
