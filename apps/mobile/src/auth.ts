import type { MobileConfig } from './env-config.js';

// ── Types ──────────────────────────────────────────────────────────────────

export type AuthSession = Readonly<{
  accessToken: string;
  expiresAt: number; // ms epoch
  firebaseUid: string;
  internalUserId: string;
  refreshToken: string;
  suspended: boolean;
}>;

export type AuthStatus =
  | 'LOADING'
  | 'SIGNED_OUT'
  | 'SIGNED_IN'
  | 'SUSPENDED'
  | 'ERROR';

export type AuthErrorCode =
  | 'CREDENTIALS_INVALID'
  | 'ACCOUNT_SUSPENDED'
  | 'TOKEN_EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

// ── Token storage abstraction ──────────────────────────────────────────────

/**
 * Secure token storage adapter.
 * On React Native this wraps `expo-secure-store`; in tests a simple map.
 */
export type SecureStoragePort = Readonly<{
  clear(): Promise<void>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}>;

const STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN: 'pim_auth_access_token',
  EXPIRES_AT: 'pim_auth_expires_at',
  FIREBASE_UID: 'pim_auth_firebase_uid',
  INTERNAL_USER_ID: 'pim_auth_internal_user_id',
  REFRESH_TOKEN: 'pim_auth_refresh_token',
  SUSPENDED: 'pim_auth_suspended',
});

export type FireAuthPort = Readonly<{
  signIn(
    email: string,
    password: string,
  ): Promise<
    Readonly<{ firebaseUid: string; idToken: string; refreshToken: string }>
  >;
  signOut(): Promise<void>;
  refreshToken(
    token: string,
  ): Promise<Readonly<{ idToken: string; expiresIn: number }>>;
}>;

// ── Auth client ────────────────────────────────────────────────────────────

export type AuthClient = Readonly<{
  getSession(): Promise<AuthSession | null>;
  getStatus(): AuthStatus;
  isTokenExpired(): boolean;
  restoreSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  handleTokenExpired(): Promise<void>;
  handleSuspended(statusCode: number): Promise<void>;
}>;

export type AuthClientPorts = Readonly<{
  config: MobileConfig;
  fireAuth: FireAuthPort;
  secureStorage: SecureStoragePort;
  internalIdentityPort: {
    resolveInternalUserId(firebaseUid: string): Promise<{
      internalUserId: string;
      suspended: boolean;
    }>;
  };
}>;

export class MobileAuthError extends Error {
  readonly code: AuthErrorCode;
  readonly httpStatus: number | null;

  constructor(
    code: AuthErrorCode,
    message: string,
    httpStatus: number | null = null,
  ) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.name = 'MobileAuthError';
  }
}

export function createAuthClient(ports: AuthClientPorts): AuthClient {
  const storage = ports.secureStorage;
  let cachedStatus: AuthStatus = 'LOADING';

  function nowEpoch(): number {
    return Date.now();
  }

  function setStatus(s: AuthStatus): void {
    cachedStatus = s;
  }

  function getStatus(): AuthStatus {
    return cachedStatus;
  }

  function sessionFromStorage(
    data: Record<string, string | null>,
  ): AuthSession | null {
    if (
      !data[STORAGE_KEYS.ACCESS_TOKEN] ||
      !data[STORAGE_KEYS.EXPIRES_AT] ||
      !data[STORAGE_KEYS.FIREBASE_UID] ||
      !data[STORAGE_KEYS.INTERNAL_USER_ID]
    ) {
      return null;
    }
    return {
      accessToken: data[STORAGE_KEYS.ACCESS_TOKEN]!,
      expiresAt: Number(data[STORAGE_KEYS.EXPIRES_AT]),
      firebaseUid: data[STORAGE_KEYS.FIREBASE_UID]!,
      internalUserId: data[STORAGE_KEYS.INTERNAL_USER_ID]!,
      refreshToken: data[STORAGE_KEYS.REFRESH_TOKEN] ?? '',
      suspended: data[STORAGE_KEYS.SUSPENDED] === 'true',
    };
  }

  async function persistSession(session: AuthSession): Promise<void> {
    await storage.set(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
    await storage.set(STORAGE_KEYS.EXPIRES_AT, String(session.expiresAt));
    await storage.set(STORAGE_KEYS.FIREBASE_UID, session.firebaseUid);
    await storage.set(STORAGE_KEYS.INTERNAL_USER_ID, session.internalUserId);
    await storage.set(STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
    await storage.set(STORAGE_KEYS.SUSPENDED, String(session.suspended));
  }

  async function restoreSession(): Promise<AuthSession | null> {
    try {
      const keys = [
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.EXPIRES_AT,
        STORAGE_KEYS.FIREBASE_UID,
        STORAGE_KEYS.INTERNAL_USER_ID,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.SUSPENDED,
      ];
      const entries = await Promise.all(keys.map((k) => storage.get(k)));
      const data: Record<string, string | null> = {};
      keys.forEach((k, i) => {
        data[k] = entries[i];
      });
      const session = sessionFromStorage(data);
      if (session) {
        setStatus(session.suspended ? 'SUSPENDED' : 'SIGNED_IN');
        if (isTokenExpired(session)) {
          try {
            return await tryRefresh(session);
          } catch {
            return session;
          }
        }
        return session;
      }
      setStatus('SIGNED_OUT');
      return null;
    } catch {
      setStatus('ERROR');
      return null;
    }
  }

  function isTokenExpired(session?: AuthSession): boolean {
    const s = session ?? null;
    if (!s) return false;
    return nowEpoch() >= s.expiresAt - 60_000;
  }

  async function tryRefresh(session: AuthSession): Promise<AuthSession> {
    const refreshed = await ports.fireAuth.refreshToken(session.refreshToken);
    const newExpiry = nowEpoch() + refreshed.expiresIn * 1000;
    const updated: AuthSession = {
      ...session,
      accessToken: refreshed.idToken,
      expiresAt: newExpiry,
    };
    await persistSession(updated);
    setStatus('SIGNED_IN');
    return updated;
  }

  async function signIn(email: string, password: string): Promise<AuthSession> {
    const authResult = await ports.fireAuth.signIn(email, password);
    const identity = await ports.internalIdentityPort.resolveInternalUserId(
      authResult.firebaseUid,
    );

    const session: AuthSession = {
      accessToken: authResult.idToken,
      expiresAt: nowEpoch() + 3600_000,
      firebaseUid: authResult.firebaseUid,
      internalUserId: identity.internalUserId,
      refreshToken: authResult.refreshToken,
      suspended: identity.suspended,
    };

    if (identity.suspended) {
      setStatus('SUSPENDED');
      throw new MobileAuthError(
        'ACCOUNT_SUSPENDED',
        'Account is suspended',
        423,
      );
    }

    await persistSession(session);
    setStatus('SIGNED_IN');
    return session;
  }

  async function signOut(): Promise<void> {
    try {
      await ports.fireAuth.signOut();
    } catch {
      // best-effort
    }
    await storage.clear();
    setStatus('SIGNED_OUT');
  }

  async function handleTokenExpired(): Promise<void> {
    const session = await restoreSession();
    if (!session || isTokenExpired(session)) {
      await storage.clear();
      setStatus('SIGNED_OUT');
      throw new MobileAuthError('TOKEN_EXPIRED', 'Session expired', 401);
    }
  }

  async function handleSuspended(statusCode: number): Promise<void> {
    await storage.set(STORAGE_KEYS.SUSPENDED, 'true');
    setStatus('SUSPENDED');
    throw new MobileAuthError(
      'ACCOUNT_SUSPENDED',
      'Account is suspended',
      statusCode,
    );
  }

  async function getSession(): Promise<AuthSession | null> {
    return restoreSession();
  }

  return {
    getSession,
    getStatus,
    handleSuspended,
    handleTokenExpired,
    isTokenExpired: () => isTokenExpired(),
    restoreSession,
    signIn,
    signOut,
  };
}
