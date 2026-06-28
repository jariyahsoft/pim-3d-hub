import { describe, expect, it } from 'vitest'
import {
  createFirebaseIdentityAdapterConfig,
  firebaseEnvironmentMatrix,
  loadAppConfig,
  loadServerConfig,
} from './index.js'

const baseEnv = {
  API_BASE_URL: 'http://localhost:3001',
  APP_BASE_URL: 'http://localhost:3000',
  APP_CHECK_MODE: 'disabled-local',
  APP_ENV: 'local',
  EMAIL_PROVIDER: 'placeholder',
  FILE_SCAN_PROVIDER: 'placeholder',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_CLIENT_EMAIL: 'service-account@example.invalid',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nREPLACE_WITH_A_REAL_SECRET_OUTSIDE_GIT\\n-----END PRIVATE KEY-----',
  FIREBASE_PROJECT_ID: 'demo-pim-3d-hub-local',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  LOG_LEVEL: 'info',
  OTEL_EXPORTER_ENDPOINT: '',
  PAYMENT_PROVIDER: 'sandbox',
  PAYMENT_WEBHOOK_SECRET: 'replace-me',
  SEARCH_PROVIDER: 'placeholder',
  STORAGE_BUCKET: 'your-storage-bucket',
} as const

describe('config firebase guardrails', () => {
  it('builds a firebase identity adapter contract for the local emulator flow', () => {
    const config = createFirebaseIdentityAdapterConfig({
      appBaseUrl: 'http://localhost:3000',
      appEnv: 'local',
      firebaseProjectId: 'demo-pim-3d-hub-local',
    })

    expect(config.environment).toEqual(firebaseEnvironmentMatrix.local)
    expect(config.projectId).toBe('demo-pim-3d-hub-local')
    expect(config.emulatorHost).toBe('127.0.0.1:9099')
    expect(config.supportedAuthProviders).toEqual(['emailPassword', 'google', 'apple', 'phone'])
    expect(config.testFlowProviders).toEqual(['emailPassword', 'phone'])
    expect(config.authorizedDomains).toEqual(['127.0.0.1', 'localhost'])
    expect(config.redirectUrls).toEqual(['http://localhost:3000/auth/callback'])
  })

  it('returns firebase configuration through the app config loader', () => {
    const config = loadAppConfig(baseEnv)

    expect(config.client.firebaseProjectId).toBe('demo-pim-3d-hub-local')
    expect(config.firebase.environment).toEqual(firebaseEnvironmentMatrix.local)
    expect(config.firebase.projectId).toBe('demo-pim-3d-hub-local')
  })

  it('rejects development firebase credentials in production', () => {
    expect(() =>
      loadServerConfig({
        ...baseEnv,
        APP_BASE_URL: 'https://app.example.com',
        APP_CHECK_MODE: 'monitor',
        API_BASE_URL: 'https://api.example.com',
        APP_ENV: 'production',
        FIREBASE_PROJECT_ID: 'your-production-firebase-project-id',
      }),
    ).toThrow(/Production Firebase configuration cannot use development placeholders/)
  })

  it('rejects emulator hosts outside the local environment', () => {
    expect(() =>
      loadServerConfig({
        ...baseEnv,
        APP_BASE_URL: 'https://development.example.com',
        APP_CHECK_MODE: 'monitor',
        API_BASE_URL: 'https://api.development.example.com',
        APP_ENV: 'development',
      }),
    ).toThrow(/Non-local Firebase configuration cannot use emulator hosts/)
  })
})
