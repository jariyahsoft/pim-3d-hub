import { describe, it, expect } from 'vitest';
import { mobileConfig } from './env-config.js';
import { ROUTES, TAB_ROUTES, CREATE_MENU, TAB_LABELS } from './navigation.js';

describe('mobileConfig', () => {
  it('has a default appEnv', () => {
    expect(mobileConfig.appEnv).toBeTruthy();
    expect(['development', 'staging', 'production']).toContain(
      mobileConfig.appEnv,
    );
  });

  it('has a default apiBaseUrl', () => {
    expect(mobileConfig.apiBaseUrl).toContain('localhost');
  });

  it('has a default firebaseProjectId', () => {
    expect(mobileConfig.firebaseProjectId).toBeTruthy();
  });
});

describe('navigation', () => {
  it('defines all required routes', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.EXPLORE).toBe('/explore');
    expect(ROUTES.ORDERS).toBe('/orders');
    expect(ROUTES.PROFILE).toBe('/profile');
    expect(ROUTES.CREATE.INDEX).toBe('/create');
    expect(ROUTES.CREATE.UPLOAD_AND_QUOTE).toBe('/create/upload');
    expect(ROUTES.CREATE.CONTENT).toBe('/create/content');
    expect(ROUTES.POST_DETAIL).toBe('/post/:postId');
    expect(ROUTES.PRODUCT_DETAIL).toBe('/product/:productId');
    expect(ROUTES.CHECKOUT).toBe('/checkout/:quoteId');
  });

  it('has 5 tab routes', () => {
    expect(TAB_ROUTES).toHaveLength(5);
  });

  it('each tab has a Thai label', () => {
    for (const route of TAB_ROUTES) {
      expect(typeof TAB_LABELS[route]).toBe('string');
      expect(TAB_LABELS[route].length).toBeGreaterThan(0);
    }
  });

  it('tabs include home, explore, create, orders, profile', () => {
    expect(TAB_ROUTES).toContain('/');
    expect(TAB_ROUTES).toContain('/explore');
    expect(TAB_ROUTES).toContain('/create');
    expect(TAB_ROUTES).toContain('/orders');
    expect(TAB_ROUTES).toContain('/profile');
  });

  it('create menu has 5 items', () => {
    expect(CREATE_MENU).toHaveLength(5);
  });

  it('every create menu item has a Thai label and route', () => {
    for (const item of CREATE_MENU) {
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.route).toBe('string');
      expect(item.route).toContain('/create');
    }
  });
});

describe('api-client', () => {
  it('creates an api client without errors', async () => {
    // We can't test actual HTTP calls without a server, so we verify
    // that the module imports and creates without throwing.
    const { createApiClient } = await import('./api-client.js');

    const client = createApiClient(mobileConfig, async () => null);
    expect(client).toBeDefined();
    expect(typeof client.health).toBe('function');
    expect(typeof client.request).toBe('function');
  });

  it('health() returns network error when no server is running', async () => {
    const { createApiClient } = await import('./api-client.js');
    const client = createApiClient(mobileConfig, async () => null);
    const result = await client.health();

    // Since no server is running, we expect a network error
    expect(result).toHaveProperty('error');
  });
});
