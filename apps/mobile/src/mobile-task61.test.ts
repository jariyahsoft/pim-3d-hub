import { describe, it, expect } from 'vitest';
import {
  createPushDeepLinkService,
  type PushNotificationPayload,
} from './push-deep-links.js';
import {
  createCameraUploadService,
  COMPRESSION_POLICIES,
  MediaPermissionDeniedError,
  type BackgroundUploadPort,
  type CameraGalleryPort,
} from './camera-upload.js';
import {
  createOfflineDraftService,
  OFFLINE_DRAFT_SCHEMA_VERSION,
  isTransitionSafeOffline,
  schemaUpToDate,
  type OfflineDraft,
  type OfflineDraftStoragePort,
} from './offline-drafts.js';

// ── Push / Deep Links ─────────────────────────────────────────────────

function makePushSvc(opts?: {
  accessGranted?: boolean;
  tokenAccepted?: boolean;
}) {
  const granted = opts?.accessGranted ?? true;
  const tokenAccepted = opts?.tokenAccepted ?? true;
  return createPushDeepLinkService({
    authClient: {} as any,
    deepLinkPort: {
      async getInitialLink() {
        return null;
      },
      onLinkReceived() {
        return () => {};
      },
      async openSettings() {},
    },
    pushNotificationPort: {
      async registerToken() {
        return { accepted: tokenAccepted };
      },
      async unregisterToken() {},
      async getInitialNotification() {
        return null;
      },
      onNotificationReceived() {
        return () => {};
      },
      async requestPermission() {
        return granted;
      },
    },
    routeAccessValidationPort: {
      async checkAccess(path: string) {
        if (path.startsWith('/orders/') || path === '/orders')
          return { authorized: true };
        return { authorized: false, reason: 'Forbidden' };
      },
    },
    tokenRegistrationApiPort: {
      async postToken() {
        return { accepted: tokenAccepted };
      },
      async deleteToken() {},
    },
  });
}

describe('PushDeepLinkService', () => {
  it('authorizes an order deep link when route access check passes', async () => {
    const svc = makePushSvc();
    const auth = await svc.authorizeDeepLink(
      'https://pim3d.page/orders/order-123',
    );
    expect(auth.authorized).toBe(true);
    expect(auth.redirectPath).toBe('/orders/order-123');
  });

  it('rejects an unauthorized deep link', async () => {
    const svc = makePushSvc();
    const auth = await svc.authorizeDeepLink('https://pim3d.page/admin/secret');
    expect(auth.authorized).toBe(false);
    expect(typeof auth.redirectPath).toBe('string');
  });

  it('handles incoming notification with valid deep link', async () => {
    const svc = makePushSvc();
    const notification: PushNotificationPayload = {
      body: 'Your order has shipped',
      deepLink: '/orders/order-123',
      kind: 'SHIPMENT_UPDATE',
      metadata: { orderId: 'order-123' },
      title: 'Shipped!',
    };
    const result = await svc.handleIncomingNotification(notification);
    expect(result.authorized).toBe(true);
  });

  it('rejects notification kind that does not match the route', async () => {
    const svc = makePushSvc();
    const notification: PushNotificationPayload = {
      body: 'New message',
      deepLink: '/orders/order-123',
      kind: 'MESSAGE',
      metadata: {},
      title: 'Message',
    };
    const result = await svc.handleIncomingNotification(notification);
    expect(result.authorized).toBe(false);
  });

  it('registers a device token successfully', async () => {
    const svc = makePushSvc();
    const result = await svc.registerDeviceToken('device-token-abc');
    expect(result.accepted).toBe(true);
  });

  it('handles failed token registration', async () => {
    const svc = makePushSvc({ tokenAccepted: false });
    const result = await svc.registerDeviceToken('bad-token');
    expect(result.accepted).toBe(false);
  });

  it('validates route access via API port', async () => {
    const svc = makePushSvc();
    const auth = await svc.validateRouteAccess('/orders/1');
    expect(auth.authorized).toBe(true);
  });
});

// ── Camera / Upload ───────────────────────────────────────────────────

function makeCameraPort(): CameraGalleryPort {
  return {
    async pickMedia(_source) {
      return {
        localUri: '/tmp/cap.jpg',
        mimeType: 'image/jpeg',
        originalName: 'cap.jpg',
        originalSizeBytes: 204800,
      };
    },
    async requestPermission() {
      return true;
    },
    async checkPermission() {
      return 'granted';
    },
    async compress(uri) {
      return uri;
    },
  };
}

function makeUploader(): BackgroundUploadPort {
  return {
    async startUpload() {
      return 'task-1';
    },
    async cancelUpload() {},
    onProgress() {
      return () => {};
    },
    async waitForCompletion() {
      return { status: 'completed' };
    },
  };
}

describe('CameraUploadService', () => {
  it('pickAndCompress returns null on cancel', async () => {
    const svc = createCameraUploadService({
      apiClient: {} as any,
      backgroundUploadPort: makeUploader(),
      cameraGalleryPort: {
        async pickMedia() {
          return null;
        },
        async requestPermission() {
          return true;
        },
        async checkPermission() {
          return 'granted';
        },
        async compress(uri) {
          return uri;
        },
      },
    });
    expect(await svc.pickAndCompress('GALLERY', 'AVATAR')).toBeNull();
  });

  it('pickAndCompress returns media when picked', async () => {
    const svc = createCameraUploadService({
      apiClient: {} as any,
      backgroundUploadPort: makeUploader(),
      cameraGalleryPort: makeCameraPort(),
    });
    const result = await svc.pickAndCompress('CAMERA', 'REFERENCE_PHOTO');
    expect(result).not.toBeNull();
  });

  it('throws permission error when denied', async () => {
    const deniedPort: CameraGalleryPort = {
      async pickMedia() {
        return null;
      },
      async requestPermission() {
        return false;
      },
      async checkPermission() {
        return 'denied';
      },
      async compress(uri) {
        return uri;
      },
    };
    const svc = createCameraUploadService({
      apiClient: {} as any,
      backgroundUploadPort: makeUploader(),
      cameraGalleryPort: deniedPort,
    });
    await expect(svc.pickAndCompress('CAMERA', 'AVATAR')).rejects.toThrow(
      MediaPermissionDeniedError,
    );
  });

  it('compression policies defined for all purposes', () => {
    for (const p of [
      'MODEL_3D',
      'REFERENCE_PHOTO',
      'EVIDENCE',
      'AVATAR',
      'COVER',
    ]) {
      expect(COMPRESSION_POLICIES[p]).toBeDefined();
    }
  });
});

// ── Offline Drafts ────────────────────────────────────────────────────

function makeDraftStorage(): OfflineDraftStoragePort {
  const store = new Map<string, OfflineDraft>();
  return {
    async save(kind, data) {
      const now = new Date().toISOString();
      const draft: OfflineDraft = {
        createdAt: now,
        data,
        expectedVersion: null,
        kind,
        schemaVersion: OFFLINE_DRAFT_SCHEMA_VERSION,
        serverUpdatedAt: null,
        updatedAt: now,
      };
      store.set(kind, draft);
      return draft;
    },
    async load(kind) {
      return store.get(kind) ?? null;
    },
    async remove(kind) {
      store.delete(kind);
    },
    async list() {
      return Array.from(store.values());
    },
    async removeExpired() {
      return 0;
    },
  };
}

describe('OfflineDraftService', () => {
  it('saves and loads a draft', async () => {
    const storage = makeDraftStorage();
    const svc = createOfflineDraftService(storage);
    await svc.saveDraft('UPLOAD', '{"file":"model.stl"}');
    const loaded = await svc.loadDraft('UPLOAD');
    expect(loaded).not.toBeNull();
    expect(loaded!.data).toBe('{"file":"model.stl"}');
  });

  it('returns null for non-existent draft', async () => {
    const svc = createOfflineDraftService(makeDraftStorage());
    expect(await svc.loadDraft('POST')).toBeNull();
  });

  it('removes a draft', async () => {
    const storage = makeDraftStorage();
    const svc = createOfflineDraftService(storage);
    await svc.saveDraft('PRODUCT_LISTING', '{}');
    await svc.removeDraft('PRODUCT_LISTING');
    expect(await svc.loadDraft('PRODUCT_LISTING')).toBeNull();
  });

  it('blocks unsafe transitions offline', () => {
    expect(isTransitionSafeOffline('POST')).toBe(true);
    expect(isTransitionSafeOffline('UPLOAD')).toBe(false);
    expect(isTransitionSafeOffline('SERVICE_REQUEST')).toBe(false);
    expect(isTransitionSafeOffline('PROFILE_EDIT')).toBe(true);
  });

  it('schemaUpToDate check works', () => {
    expect(
      schemaUpToDate({ schemaVersion: OFFLINE_DRAFT_SCHEMA_VERSION } as any),
    ).toBe(true);
    expect(schemaUpToDate({ schemaVersion: 999 } as any)).toBe(false);
  });
});
