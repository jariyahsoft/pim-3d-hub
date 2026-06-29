import { describe, it, expect } from 'vitest';
import {
  createAuthClient,
  MobileAuthError,
  type SecureStoragePort,
  type FireAuthPort,
} from './auth.js';
import type { Uuidv7 } from '@pim/domain';

const FAKE_UID = 'firebase-uid-001';
const FAKE_INTERNAL_ID = '00000000-0000-7000-0000-000000000001' as Uuidv7;

function makeSecureStorage(): SecureStoragePort {
  const store = new Map<string, string>();
  return {
    async clear() {
      store.clear();
    },
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async set(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function makeFireAuth(): FireAuthPort {
  return {
    async signIn(email, _password) {
      if (email === 'bad@test.com') {
        throw new MobileAuthError(
          'CREDENTIALS_INVALID',
          'Invalid credentials',
          401,
        );
      }
      if (email === 'suspended@test.com') {
        return {
          firebaseUid: FAKE_UID,
          idToken: 'id-token-suspended',
          refreshToken: 'rt-suspended',
        };
      }
      return {
        firebaseUid: FAKE_UID,
        idToken: 'id-token-ok',
        refreshToken: 'rt-ok',
      };
    },
    async signOut() {
      // noop
    },
    async refreshToken(_token) {
      return { idToken: 'refreshed-token', expiresIn: 3600 };
    },
  };
}

function makeSvc(opts?: { suspended?: boolean }) {
  const storage = makeSecureStorage();
  const fireAuth = makeFireAuth();
  const auth = createAuthClient({
    config: {
      appEnv: 'development',
      apiBaseUrl: 'http://localhost:3000',
      appBaseUrl: 'http://localhost:8081',
      firebaseApiKey: 'test-key',
      firebaseAuthDomain: 'test.firebaseapp.com',
      firebaseProjectId: 'test-project',
      storageBucket: 'test.appspot.com',
    },
    fireAuth,
    secureStorage: storage,
    internalIdentityPort: {
      async resolveInternalUserId(_firebaseUid: string) {
        return {
          internalUserId: FAKE_INTERNAL_ID,
          suspended: opts?.suspended ?? false,
        };
      },
    },
  });
  return { auth, fireAuth, storage };
}

describe('AuthClient', () => {
  it('starts in LOADING status', () => {
    const { auth } = makeSvc();
    expect(auth.getStatus()).toBe('LOADING');
  });

  it('signs in successfully and persists session', async () => {
    const { auth, storage } = makeSvc();
    const session = await auth.signIn('test@example.com', 'password123');

    expect(session.accessToken).toBe('id-token-ok');
    expect(session.internalUserId).toBe(FAKE_INTERNAL_ID);
    expect(session.suspended).toBe(false);

    const storedToken = await storage.get('pim_auth_access_token');
    expect(storedToken).toBe('id-token-ok');
    expect(auth.getStatus()).toBe('SIGNED_IN');
  });

  it('rejects suspended account at sign-in', async () => {
    const { auth } = makeSvc({ suspended: true });
    await expect(
      auth.signIn('suspended@test.com', 'password123'),
    ).rejects.toThrow(MobileAuthError);
    expect(auth.getStatus()).toBe('SUSPENDED');
  });

  it('signs out and clears storage', async () => {
    const { auth, storage } = makeSvc();
    await auth.signIn('test@example.com', 'password123');
    await auth.signOut();

    const storedToken = await storage.get('pim_auth_access_token');
    expect(storedToken).toBeNull();
    expect(auth.getStatus()).toBe('SIGNED_OUT');
  });

  it('restores session from storage', async () => {
    const { auth, storage } = makeSvc();
    await storage.set('pim_auth_access_token', 'stored-token');
    await storage.set('pim_auth_expires_at', String(Date.now() + 3600_000));
    await storage.set('pim_auth_firebase_uid', FAKE_UID);
    await storage.set('pim_auth_internal_user_id', FAKE_INTERNAL_ID);
    await storage.set('pim_auth_refresh_token', 'stored-rt');
    await storage.set('pim_auth_suspended', 'false');

    const session = await auth.restoreSession();
    expect(session).not.toBeNull();
    expect(session!.accessToken).toBe('stored-token');
    expect(auth.getStatus()).toBe('SIGNED_IN');
  });

  it('returns null when no session stored', async () => {
    const { auth } = makeSvc();
    const session = await auth.restoreSession();
    expect(session).toBeNull();
    expect(auth.getStatus()).toBe('SIGNED_OUT');
  });

  it('stores suspended flag and throws on handleSuspended', async () => {
    const { auth, storage } = makeSvc();
    await expect(auth.handleSuspended(423)).rejects.toThrow(MobileAuthError);
    const suspended = await storage.get('pim_auth_suspended');
    expect(suspended).toBe('true');
    expect(auth.getStatus()).toBe('SUSPENDED');
  });

  it('handles token expiry gracefully', async () => {
    const { auth, storage } = makeSvc();
    await storage.set('pim_auth_access_token', 'old-token');
    await storage.set('pim_auth_expires_at', String(Date.now() - 10_000)); // expired
    await storage.set('pim_auth_firebase_uid', FAKE_UID);
    await storage.set('pim_auth_internal_user_id', FAKE_INTERNAL_ID);
    await storage.set('pim_auth_refresh_token', 'old-rt');
    await storage.set('pim_auth_suspended', 'false');

    const restored = await auth.restoreSession();
    // We get refreshed token because tryRefresh is called
    expect(restored).not.toBeNull();
    // The refresh succeeds in test stub
  });
});
