import type { AuthClient } from './auth.js';

// ── Types ───────────────────────────────────────────────────────────────

export type PushNotificationKind =
  | 'ORDER_STATUS'
  | 'MESSAGE'
  | 'QUOTE_EXPIRY'
  | 'PAYMENT_CONFIRMED'
  | 'PRODUCTION_UPDATE'
  | 'SHIPMENT_UPDATE'
  | 'CONTENT_COMMENT'
  | 'PROMOTION_MARKETING'
  | 'REPORT_RESOLUTION';

export type PushNotificationPayload = Readonly<{
  body: string;
  deepLink: string | null;
  kind: PushNotificationKind;
  metadata: Readonly<Record<string, string>>;
  title: string;
}>;

export type DeepLinkAuthorization = Readonly<{
  authorized: boolean;
  reason?: string;
  redirectPath?: string;
}>;

export type TokenRegistrationResult = Readonly<{
  accepted: boolean;
  reason?: string;
}>;

export type PushNotificationPort = Readonly<{
  registerToken(token: string): Promise<TokenRegistrationResult>;
  unregisterToken(token: string): Promise<void>;
  getInitialNotification(): Promise<PushNotificationPayload | null>;
  onNotificationReceived(
    handler: (notification: PushNotificationPayload) => void,
  ): () => void;
  requestPermission(): Promise<boolean>;
}>;

export type DeepLinkPort = Readonly<{
  getInitialLink(): Promise<string | null>;
  onLinkReceived(handler: (url: string) => void): () => void;
  openSettings(): Promise<void>;
}>;

const ROUTE_AUTHORIZATION_KINDS: Record<string, PushNotificationKind[]> = {
  '/orders/': ['ORDER_STATUS', 'PAYMENT_CONFIRMED', 'SHIPMENT_UPDATE'],
  '/order/': ['ORDER_STATUS', 'PAYMENT_CONFIRMED', 'SHIPMENT_UPDATE'],
  '/messages/': ['MESSAGE'],
  '/post/': ['CONTENT_COMMENT'],
  '/checkout/': ['QUOTE_EXPIRY', 'PAYMENT_CONFIRMED'],
  '/upload/': ['PRODUCTION_UPDATE'],
  '/provider/': ['PRODUCTION_UPDATE'],
};

function findRouteKinds(path: string): PushNotificationKind[] {
  for (const [prefix, kinds] of Object.entries(ROUTE_AUTHORIZATION_KINDS)) {
    if (path.startsWith(prefix)) return kinds;
  }
  return [];
}

function extractPath(url: string): string {
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('pim3d://')
  ) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url;
}

// ── Service ─────────────────────────────────────────────────────────────

export type PushDeepLinkService = Readonly<{
  authorizeDeepLink(url: string): Promise<DeepLinkAuthorization>;
  handleIncomingNotification(
    notification: PushNotificationPayload,
  ): Promise<DeepLinkAuthorization>;
  registerDeviceToken(token: string): Promise<TokenRegistrationResult>;
  unregisterDeviceToken(token: string): Promise<void>;
  requestPermission(): Promise<boolean>;
  validateRouteAccess(path: string): Promise<DeepLinkAuthorization>;
}>;

export type PushDeepLinkServicePorts = Readonly<{
  authClient: AuthClient;
  deepLinkPort: DeepLinkPort;
  pushNotificationPort: PushNotificationPort;
  routeAccessValidationPort: {
    checkAccess(path: string): Promise<DeepLinkAuthorization>;
  };
  tokenRegistrationApiPort: {
    postToken(token: string): Promise<TokenRegistrationResult>;
    deleteToken(token: string): Promise<void>;
  };
}>;

export function createPushDeepLinkService(
  ports: PushDeepLinkServicePorts,
): PushDeepLinkService {
  async function authorizeDeepLink(
    url: string,
  ): Promise<DeepLinkAuthorization> {
    try {
      const path = extractPath(url);
      const authorized =
        await ports.routeAccessValidationPort.checkAccess(path);
      if (!authorized.authorized) {
        return {
          authorized: false,
          reason: authorized.reason ?? 'Unauthorized route',
          redirectPath: '/',
        };
      }
      return { authorized: true, redirectPath: path };
    } catch {
      return { authorized: false, reason: 'Invalid link', redirectPath: '/' };
    }
  }

  async function handleIncomingNotification(
    notification: PushNotificationPayload,
  ): Promise<DeepLinkAuthorization> {
    if (!notification.deepLink) {
      return { authorized: true, redirectPath: '/' };
    }
    const path = extractPath(notification.deepLink);
    const allowedKinds = findRouteKinds(path);
    if (allowedKinds.length > 0 && !allowedKinds.includes(notification.kind)) {
      return {
        authorized: false,
        reason: `Notification kind ${notification.kind} not authorized for route ${path}`,
        redirectPath: '/',
      };
    }
    return authorizeDeepLink(notification.deepLink);
  }

  async function registerDeviceToken(
    token: string,
  ): Promise<TokenRegistrationResult> {
    try {
      return await ports.tokenRegistrationApiPort.postToken(token);
    } catch {
      return { accepted: false, reason: 'Registration failed' };
    }
  }

  async function unregisterDeviceToken(token: string): Promise<void> {
    await ports.tokenRegistrationApiPort.deleteToken(token);
  }

  async function requestPermission(): Promise<boolean> {
    return ports.pushNotificationPort.requestPermission();
  }

  async function validateRouteAccess(
    path: string,
  ): Promise<DeepLinkAuthorization> {
    return ports.routeAccessValidationPort.checkAccess(path);
  }

  return {
    authorizeDeepLink,
    handleIncomingNotification,
    registerDeviceToken,
    unregisterDeviceToken,
    requestPermission,
    validateRouteAccess,
  };
}
