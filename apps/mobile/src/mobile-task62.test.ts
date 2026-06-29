import { describe, it, expect } from 'vitest';
import {
  createSellerWorkspaceService,
  type _SellerWorkspaceService,
} from './seller-workspace.js';
import {
  runMobileQualityChecklist,
  type SecureStoragePort,
  type AuthClient,
  type QualityReportConfig,
} from './mobile-quality-checklist.js';
import {
  getEnvironmentTarget,
  getBuildConfig,
  PRIVACY_DISCLOSURES,
  PERMISSION_RATIONALES,
  ROLLBACK_PROCEDURE,
} from './store-deployment.js';

// ── Seller Workspace ─────────────────────────────────────────────────

function makeMockApi() {
  return {
    request: async (init: any) => {
      if (init.path.includes('/seller/orders') && init.method === 'GET') {
        return {
          data: [
            {
              buyerName: 'Test',
              buyerPhone: null,
              createdAt: '2026-07-01T00:00:00Z',
              itemSummary: 'Spool PLA',
              orderId: 'o-1',
              orderNumber: 'PO-1001',
              status: 'PENDING_PAYMENT',
              totalMinor: 50000,
            },
          ],
          meta: { requestId: 'r1' },
        };
      }
      if (init.path.includes('/seller/earnings')) {
        return {
          data: {
            completedOrders: 10,
            completedOrdersRevenue: 250000,
            currentMonthRevenue: 50000,
            currency: 'THB',
            pendingPayout: 30000,
            totalLifetimeRevenue: 500000,
          },
          meta: { requestId: 'r2' },
        };
      }
      if (init.method === 'POST') {
        return {
          data: { accepted: true, message: 'success', newStatus: 'CONFIRMED' },
          meta: { requestId: 'r3' },
        };
      }
      return { data: null, meta: { requestId: 'r0' } };
    },
  } as any;
}

describe('SellerWorkspaceService', () => {
  it('lists orders', async () => {
    const svc = createSellerWorkspaceService({
      apiClient: makeMockApi(),
      authClient: {} as any,
    });
    const orders = await svc.listOrders();
    expect(orders).toHaveLength(1);
    expect(orders[0].buyerName).toBe('Test');
    expect(orders[0].orderNumber).toBe('PO-1001');
  });

  it('confirms an order', async () => {
    const svc = createSellerWorkspaceService({
      apiClient: makeMockApi(),
      authClient: {} as any,
    });
    const result = await svc.confirmOrder('o-1', 1);
    expect(result.accepted).toBe(true);
    expect(result.newStatus).toBe('CONFIRMED');
  });

  it('declines an order', async () => {
    const svc = createSellerWorkspaceService({
      apiClient: makeMockApi(),
      authClient: {} as any,
    });
    const result = await svc.declineOrder('o-1', 1, 'Out of stock');
    expect(result.accepted).toBe(true);
  });

  it('submits production update', async () => {
    const svc = createSellerWorkspaceService({
      apiClient: makeMockApi(),
      authClient: {} as any,
    });
    const result = await svc.submitProductionUpdate({
      message: 'Print started',
      orderId: 'o-1',
      type: 'TEXT',
    });
    expect(result.accepted).toBe(true);
  });

  it('creates a shipment', async () => {
    const svc = createSellerWorkspaceService({
      apiClient: makeMockApi(),
      authClient: {} as any,
    });
    const result = await svc.createShipment({
      carrier: 'Flash Express',
      orderId: 'o-1',
      trackingNumber: 'FX-123',
    });
    expect(result.accepted).toBe(true);
  });

  it('returns earnings summary', async () => {
    const svc = createSellerWorkspaceService({
      apiClient: makeMockApi(),
      authClient: {} as any,
    });
    const earnings = await svc.getEarningsSummary();
    expect(earnings.totalLifetimeRevenue).toBe(500000);
    expect(earnings.currency).toBe('THB');
    expect(earnings.completedOrders).toBe(10);
  });
});

// ── Quality Checklist ────────────────────────────────────────────────

function mockSecureStorage(): SecureStoragePort {
  return {
    async clear() {},
    async get() {
      return null;
    },
    async set() {},
  };
}

function mockAuthClient(): AuthClient {
  return {
    getSession() {
      return null as any;
    },
    getStatus() {
      return 'SIGNED_OUT';
    },
    isTokenExpired() {
      return false;
    },
    restoreSession() {
      return null as any;
    },
    signIn() {
      return null as any;
    },
    signOut() {
      return undefined as any;
    },
    handleTokenExpired() {
      return undefined as any;
    },
    handleSuspended() {
      return undefined as any;
    },
  };
}

describe('QualityChecklist', () => {
  it('passes all default checks', async () => {
    const config: QualityReportConfig = {
      platform: 'android',
      secureStorage: mockSecureStorage(),
      authClient: mockAuthClient(),
    };
    const report = await runMobileQualityChecklist(config);
    expect(report.total).toBeGreaterThanOrEqual(14);
    expect(report.passed).toBe(report.total);
  });

  it('runs without performance checks when disabled', async () => {
    const config: QualityReportConfig = {
      platform: 'ios',
      secureStorage: mockSecureStorage(),
      authClient: mockAuthClient(),
      runPerformance: false,
    };
    const report = await runMobileQualityChecklist(config);
    expect(report.platform).toBe('ios');
    expect(report.passed).toBe(report.total);
  });
});

// ── Store Deployment ─────────────────────────────────────────────────

describe('StoreDeployment', () => {
  it('returns environment target with default values', () => {
    const target = getEnvironmentTarget();
    expect(target.versionName).toBe('1.0.0');
    expect(target.versionCode).toBe(1);
    expect(target.releaseTrack).toBeTruthy();
  });

  it('overrides environment target values', () => {
    const target = getEnvironmentTarget({
      apiBaseUrl: 'https://prod.example.com',
    });
    expect(target.apiBaseUrl).toBe('https://prod.example.com');
  });

  it('returns build config for iOS production', () => {
    const config = getBuildConfig('ios', 'production');
    expect(config.codeSigning).toBe('distribution');
    expect(config.exportMethod).toBe('app-store');
    expect(config.platform).toBe('ios');
  });

  it('returns build config for Android internal', () => {
    const config = getBuildConfig('android', 'internal');
    expect(config.codeSigning).toBe('development');
    expect(config.exportMethod).toBe('development');
  });

  it('has all privacy disclosures', () => {
    expect(PRIVACY_DISCLOSURES.length).toBeGreaterThanOrEqual(5);
    const categories = PRIVACY_DISCLOSURES.map((d) => d.dataCategory);
    expect(categories).toContain('User Content');
    expect(categories).toContain('Identifiers');
  });

  it('has Thai permission rationales', () => {
    expect(PERMISSION_RATIONALES.CAMERA).toContain('3D');
    expect(PERMISSION_RATIONALES.NOTIFICATIONS).toContain('แจ้งเตือน');
  });

  it('defines a rollback procedure', () => {
    expect(ROLLBACK_PROCEDURE.steps.length).toBeGreaterThan(3);
    expect(ROLLBACK_PROCEDURE.hotfixBranchPrefix).toBe('hotfix/mobile/');
  });
});
