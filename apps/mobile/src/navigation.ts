/**
 * Baseline navigation shell for the mobile app.
 *
 * This defines the route tree that matches the UI guide (08-ui-guide.md).
 * Each screen is represented as a placeholder; business logic is imported
 * from the application layer rather than duplicated here.
 *
 * Usage (in the host framework):
 * ```
 * import { ROUTES } from '@pim/mobile';
 * // ROUTES.HOME, ROUTES.EXPLORE, etc.
 * ```
 */

// ── Route constants ───────────────────────────────────────────────────────

export const ROUTES = Object.freeze({
  HOME: '/',
  EXPLORE: '/explore',
  CREATE: {
    INDEX: '/create',
    UPLOAD_AND_QUOTE: '/create/upload',
    CONTENT: '/create/content',
    LIST_PRODUCT: '/create/product',
    LIST_SERVICE: '/create/service',
  },
  ORDERS: '/orders',
  PROFILE: '/profile',
  // Secondary
  MESSAGES: '/messages',
  NOTIFICATIONS: '/notifications',
  SAVED: '/saved',
  SELLER_DASHBOARD: '/seller/dashboard',
  EARNINGS: '/seller/earnings',
  ADMIN: '/admin',
  // Detail
  POST_DETAIL: '/post/:postId',
  PRODUCT_DETAIL: '/product/:productId',
  PROVIDER_PROFILE: '/provider/:providerId',
  ORDER_DETAIL: '/order/:orderId',
  CHECKOUT: '/checkout/:quoteId',
  UPLOAD_STATUS: '/upload/:sessionId',
} as const);

// ── Tab bar ───────────────────────────────────────────────────────────────

export type TabRoute = (typeof TAB_ROUTES)[number];

export const TAB_ROUTES = [
  ROUTES.HOME,
  ROUTES.EXPLORE,
  ROUTES.CREATE.INDEX,
  ROUTES.ORDERS,
  ROUTES.PROFILE,
] as const;

export const TAB_LABELS: Record<string, string> = Object.freeze({
  [ROUTES.HOME]: 'หน้าหลัก',
  [ROUTES.EXPLORE]: 'สำรวจ',
  [ROUTES.CREATE.INDEX]: 'สร้าง',
  [ROUTES.ORDERS]: 'คำสั่งซื้อ',
  [ROUTES.PROFILE]: 'โปรไฟล์',
});

// ── Create menu items ─────────────────────────────────────────────────────

export type CreateMenuItem = Readonly<{
  label: string;
  route: string;
}>;

export const CREATE_MENU: readonly CreateMenuItem[] = Object.freeze([
  { label: 'ขอออกแบบ/ลงงาน', route: ROUTES.CREATE.UPLOAD_AND_QUOTE },
  { label: 'อัปโหลดไฟล์เช็กราคา', route: ROUTES.CREATE.UPLOAD_AND_QUOTE },
  { label: 'สร้างคอนเทนต์', route: ROUTES.CREATE.CONTENT },
  { label: 'ลงขายสินค้า', route: ROUTES.CREATE.LIST_PRODUCT },
  { label: 'ลงบริการ', route: ROUTES.CREATE.LIST_SERVICE },
]);

// ── Screen props type (shared by all screen placeholders) ─────────────────

export type ScreenPlaceholderProps = Readonly<{
  route: {
    key?: string;
    name?: string;
    params?: Record<string, string>;
  };
  navigation: {
    navigate(path: string, params?: Record<string, string>): void;
    goBack(): void;
  };
}>;
