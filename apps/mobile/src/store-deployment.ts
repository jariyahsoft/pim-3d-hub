/**
 * Store deployment configuration and release pipeline.
 *
 * This module defines the build/environment/versioning metadata that a CI/CD
 * pipeline reads from `mobileConfig` and environment variables to produce
 * signed builds for each track.
 *
 * Privacy disclosures and permission rationales are documented here such that
 * the app store submission template can reference them.
 */

import { mobileConfig, type MobileEnvironment } from './env-config.js';

// ── Release tracks ───────────────────────────────────────────────────────

export type ReleaseTrack = 'internal' | 'alpha' | 'beta' | 'production';

export const RELEASE_TRACK_ENV_MAP: Record<MobileEnvironment, ReleaseTrack> =
  Object.freeze({
    development: 'internal',
    staging: 'alpha',
    production: 'production',
  });

// ── Versioning ───────────────────────────────────────────────────────────

export const MOBILE_APP_VERSION = '1.0.0';
export const MOBILE_BUILD_NUMBER = 1;
export const MOBILE_BUNDLE_IDENTIFIER = 'com.pim3d.marketplace';

// ── Environment targets ──────────────────────────────────────────────────

export type EnvironmentTarget = Readonly<{
  appEnv: MobileEnvironment;
  apiBaseUrl: string;
  bundleIdentifier: string;
  firebaseProjectId: string;
  releaseTrack: ReleaseTrack;
  versionName: string;
  versionCode: number;
}>;

export function getEnvironmentTarget(
  overrides?: Partial<EnvironmentTarget>,
): EnvironmentTarget {
  const env = mobileConfig;
  return {
    appEnv: env.appEnv,
    apiBaseUrl: env.apiBaseUrl,
    bundleIdentifier: MOBILE_BUNDLE_IDENTIFIER,
    firebaseProjectId: env.firebaseProjectId,
    releaseTrack: RELEASE_TRACK_ENV_MAP[env.appEnv],
    versionName: MOBILE_APP_VERSION,
    versionCode: MOBILE_BUILD_NUMBER,
    ...overrides,
  };
}

// ── Privacy disclosures (for app store submission) ────────────────────────

export type PrivacyDisclosure = Readonly<{
  dataCategory: string;
  dataType: string;
  purpose: string;
  required: boolean;
}>;

/**
 * Privacy disclosures for the App Store / Play Store listing.
 * These describe what data the app collects and why.
 */
export const PRIVACY_DISCLOSURES: readonly PrivacyDisclosure[] = Object.freeze([
  Object.freeze({
    dataCategory: 'Contact Info',
    dataType: 'Email, Phone',
    purpose: 'Account creation, order notifications',
    required: true,
  }),
  Object.freeze({
    dataCategory: 'User Content',
    dataType: '3D Files, Photos, Videos',
    purpose: 'Upload for printing, production evidence',
    required: true,
  }),
  Object.freeze({
    dataCategory: 'Identifiers',
    dataType: 'Firebase UID, Device Token',
    purpose: 'Authentication and push notifications',
    required: true,
  }),
  Object.freeze({
    dataCategory: 'Location',
    dataType: 'Province-level (not precise GPS)',
    purpose: 'Provider discovery and shipping estimates',
    required: false,
  }),
  Object.freeze({
    dataCategory: 'Usage Data',
    dataType: 'Impressions, Clicks',
    purpose: 'Analytics and promotion measurement (aggregate only)',
    required: false,
  }),
]);

/**
 * Permission rationales shown to users on first request.
 */
export const PERMISSION_RATIONALES: Record<string, string> = Object.freeze({
  CAMERA: 'ใช้สำหรับถ่ายรูปโมเดล 3D และหลักฐานการผลิต',
  GALLERY: 'ใช้เลือกรูปโมเดล 3D และรูปประกอบโพสต์',
  NOTIFICATIONS: 'แจ้งเตือนเมื่อมีอัปเดตคำสั่งซื้อและข้อความ',
  STORAGE: 'ใช้บันทึกไฟล์โมเดลเพื่ออัปโหลด',
});

// ── Build pipeline config ────────────────────────────────────────────────

export type BuildConfig = Readonly<{
  appEnv: MobileEnvironment;
  artifactsDir: string;
  bundleCommand: string;
  codeSigning: 'development' | 'distribution';
  exportMethod: 'development' | 'ad-hoc' | 'app-store' | 'enterprise';
  platform: 'ios' | 'android';
}>;

export function getBuildConfig(
  platform: 'ios' | 'android',
  track: ReleaseTrack,
): BuildConfig {
  const isProduction = track === 'production';
  return {
    appEnv: mobileConfig.appEnv,
    artifactsDir: `build/${platform}/${track}`,
    bundleCommand:
      platform === 'ios'
        ? 'eas build --platform ios'
        : 'eas build --platform android',
    codeSigning: isProduction ? 'distribution' : 'development',
    exportMethod:
      track === 'internal'
        ? 'development'
        : track === 'production'
          ? 'app-store'
          : 'ad-hoc',
    platform,
  };
}

// ── Rollback / hotfix ────────────────────────────────────────────────────

export const ROLLBACK_PROCEDURE = Object.freeze({
  steps: [
    '1. Identify the commit hash of the last known-good build.',
    '2. Create a hotfix branch from that commit.',
    '3. Apply the minimal fix and bump the patch version.',
    '4. Build with the same release track settings.',
    '5. Submit to internal testing track first, then promote.',
  ],
  hotfixBranchPrefix: 'hotfix/mobile/',
  maxRollbackVersions: 3,
});
