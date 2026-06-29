/**
 * Mobile environment configuration.
 *
 * Uses local defaults for development.  The real Firebase / API credentials
 * are configured via environment variables at build time (or loaded through
 * the Expo Config system at runtime).
 */

export type MobileEnvironment = 'development' | 'staging' | 'production';

export type MobileConfig = Readonly<{
  apiBaseUrl: string;
  appEnv: MobileEnvironment;
  appBaseUrl: string;
  firebaseProjectId: string;
  firebaseAuthDomain: string;
  firebaseApiKey: string;
  storageBucket: string;
}>;

function readMobileEnv(overrides?: Partial<MobileConfig>): MobileConfig {
  const env: Record<string, string | undefined> =
    typeof process !== 'undefined' && process.env ? process.env : {};

  return {
    appEnv: (env.APP_ENV ??
      overrides?.appEnv ??
      'development') as MobileEnvironment,
    apiBaseUrl:
      env.API_BASE_URL ??
      overrides?.apiBaseUrl ??
      'http://localhost:3000/api/v1',
    appBaseUrl:
      env.APP_BASE_URL ?? overrides?.appBaseUrl ?? 'http://localhost:8081',
    firebaseProjectId:
      env.FIREBASE_PROJECT_ID ??
      overrides?.firebaseProjectId ??
      'pim-3d-hub-local',
    firebaseAuthDomain:
      env.FIREBASE_AUTH_DOMAIN ??
      overrides?.firebaseAuthDomain ??
      'pim-3d-hub.firebaseapp.com',
    firebaseApiKey: env.FIREBASE_API_KEY ?? overrides?.firebaseApiKey ?? '',
    storageBucket:
      env.STORAGE_BUCKET ??
      overrides?.storageBucket ??
      'pim-3d-hub.appspot.com',
  };
}

export const mobileConfig: MobileConfig = Object.freeze(readMobileEnv());
