import { z } from 'zod'
import {
  createFirebaseIdentityAdapterConfig,
  firebaseEnvironmentMatrix,
  type FirebaseAuthProvider,
  type FirebaseEnvironmentMatrix,
  type FirebaseIdentityAdapterConfig,
} from './firebase.js'

type EnvironmentInput = Record<string, string | undefined>

const appEnvValues = ['local', 'development', 'staging', 'production'] as const
const appCheckModeValues = ['monitor', 'enforce', 'disabled-local'] as const
const logLevelValues = ['debug', 'info', 'warn', 'error'] as const

const publicEnvKeys = ['APP_ENV', 'APP_BASE_URL', 'API_BASE_URL', 'FIREBASE_PROJECT_ID'] as const
const serverEnvKeys = [
  'APP_ENV',
  'APP_BASE_URL',
  'API_BASE_URL',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'STORAGE_BUCKET',
  'APP_CHECK_MODE',
  'PAYMENT_PROVIDER',
  'PAYMENT_WEBHOOK_SECRET',
  'EMAIL_PROVIDER',
  'SEARCH_PROVIDER',
  'FILE_SCAN_PROVIDER',
  'OTEL_EXPORTER_ENDPOINT',
  'LOG_LEVEL',
] as const

const publicClientEnvSchema = z.object({
  APP_ENV: z.enum(appEnvValues),
  APP_BASE_URL: z.string().trim().url(),
  API_BASE_URL: z.string().trim().url(),
  FIREBASE_PROJECT_ID: z.string().trim().min(1),
})

const serverEnvSchema = z.object({
  APP_ENV: z.enum(appEnvValues),
  APP_BASE_URL: z.string().trim().url(),
  API_BASE_URL: z.string().trim().url(),
  FIREBASE_PROJECT_ID: z.string().trim().min(1),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().trim().min(1).optional(),
  FIRESTORE_EMULATOR_HOST: z.string().trim().min(1).optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().trim().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().trim().email(),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.replace(/\\n/g, '\n')),
  STORAGE_BUCKET: z.string().trim().min(1),
  APP_CHECK_MODE: z.enum(appCheckModeValues),
  PAYMENT_PROVIDER: z.string().trim().min(1),
  PAYMENT_WEBHOOK_SECRET: z.string().trim().min(1),
  EMAIL_PROVIDER: z.string().trim().min(1),
  SEARCH_PROVIDER: z.string().trim().min(1),
  FILE_SCAN_PROVIDER: z.string().trim().min(1),
  OTEL_EXPORTER_ENDPOINT: z.string().trim().url().or(z.literal('')).optional(),
  LOG_LEVEL: z.enum(logLevelValues),
})

export type PublicClientConfig = {
  appEnv: (typeof appEnvValues)[number]
  appBaseUrl: string
  apiBaseUrl: string
  firebaseProjectId: string
}

export type ServerConfig = PublicClientConfig & {
  firebaseAuthEmulatorHost: string | undefined
  firebaseClientEmail: string
  firebasePrivateKey: string
  firebaseStorageEmulatorHost: string | undefined
  firestoreEmulatorHost: string | undefined
  storageBucket: string
  appCheckMode: (typeof appCheckModeValues)[number]
  paymentProvider: string
  paymentWebhookSecret: string
  emailProvider: string
  searchProvider: string
  fileScanProvider: string
  otelExporterEndpoint: string | undefined
  logLevel: (typeof logLevelValues)[number]
}

export type AppConfig = {
  client: PublicClientConfig
  firebase: FirebaseIdentityAdapterConfig
  server: ServerConfig
}

export type { FirebaseAuthProvider, FirebaseEnvironmentMatrix, FirebaseIdentityAdapterConfig }
export { createFirebaseIdentityAdapterConfig, firebaseEnvironmentMatrix }

function readRuntimeEnvironment(): EnvironmentInput {
  const runtime = globalThis as typeof globalThis & {
    process?: {
      env?: EnvironmentInput
    }
  }

  return runtime.process?.env ?? {}
}

function pickEnvironment(
  env: EnvironmentInput,
  keys: readonly string[],
): EnvironmentInput {
  return Object.fromEntries(keys.map((key) => [key, env[key]]))
}

function formatValidationError(scope: string, error: z.ZodError): Error {
  const details = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
    return `${path}: ${issue.message}`
  })

  return new Error(
    `${scope} configuration validation failed:\n- ${details.join('\n- ')}`,
  )
}

function parseEnvironment<T extends z.ZodTypeAny>(
  scope: string,
  schema: T,
  env: EnvironmentInput,
  keys: readonly string[],
): z.output<T> {
  const result = schema.safeParse(pickEnvironment(env, keys))

  if (result.success) {
    return result.data
  }

  throw formatValidationError(scope, result.error)
}

function toPublicClientConfig(env: z.output<typeof publicClientEnvSchema>): PublicClientConfig {
  return {
    appEnv: env.APP_ENV,
    appBaseUrl: env.APP_BASE_URL,
    apiBaseUrl: env.API_BASE_URL,
    firebaseProjectId: env.FIREBASE_PROJECT_ID,
  }
}

function toServerConfig(env: z.output<typeof serverEnvSchema>): ServerConfig {
  return {
    appEnv: env.APP_ENV,
    appBaseUrl: env.APP_BASE_URL,
    apiBaseUrl: env.API_BASE_URL,
    firebaseProjectId: env.FIREBASE_PROJECT_ID,
    firebaseAuthEmulatorHost: env.FIREBASE_AUTH_EMULATOR_HOST || undefined,
    firebaseClientEmail: env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: env.FIREBASE_PRIVATE_KEY,
    firebaseStorageEmulatorHost: env.FIREBASE_STORAGE_EMULATOR_HOST || undefined,
    firestoreEmulatorHost: env.FIRESTORE_EMULATOR_HOST || undefined,
    storageBucket: env.STORAGE_BUCKET,
    appCheckMode: env.APP_CHECK_MODE,
    paymentProvider: env.PAYMENT_PROVIDER,
    paymentWebhookSecret: env.PAYMENT_WEBHOOK_SECRET,
    emailProvider: env.EMAIL_PROVIDER,
    searchProvider: env.SEARCH_PROVIDER,
    fileScanProvider: env.FILE_SCAN_PROVIDER,
    otelExporterEndpoint: env.OTEL_EXPORTER_ENDPOINT || undefined,
    logLevel: env.LOG_LEVEL,
  }
}

function containsDevelopmentPlaceholder(value: string): boolean {
  return /(?:example\.invalid|placeholder|replace(?:[_-]?me)?|your[-_]|demo-)/i.test(value)
}

function isLocalhostUrl(value: string): boolean {
  const hostname = new URL(value).hostname
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

function assertProductionFirebaseConfiguration(config: ServerConfig): void {
  if (config.appEnv === 'local') {
    return
  }

  const issues: string[] = []

  if (config.firebaseAuthEmulatorHost) {
    issues.push('FIREBASE_AUTH_EMULATOR_HOST')
  }
  if (config.firestoreEmulatorHost) {
    issues.push('FIRESTORE_EMULATOR_HOST')
  }
  if (config.firebaseStorageEmulatorHost) {
    issues.push('FIREBASE_STORAGE_EMULATOR_HOST')
  }

  if (config.appEnv !== 'production') {
    if (issues.length > 0) {
      throw new Error(
        `Non-local Firebase configuration cannot use emulator hosts: ${issues.join(', ')}`,
      )
    }
    return
  }

  if (isLocalhostUrl(config.appBaseUrl)) {
    issues.push('APP_BASE_URL')
  }
  if (isLocalhostUrl(config.apiBaseUrl)) {
    issues.push('API_BASE_URL')
  }
  if (containsDevelopmentPlaceholder(config.firebaseProjectId)) {
    issues.push('FIREBASE_PROJECT_ID')
  }
  if (containsDevelopmentPlaceholder(config.firebaseClientEmail)) {
    issues.push('FIREBASE_CLIENT_EMAIL')
  }
  if (containsDevelopmentPlaceholder(config.firebasePrivateKey)) {
    issues.push('FIREBASE_PRIVATE_KEY')
  }
  if (containsDevelopmentPlaceholder(config.storageBucket)) {
    issues.push('STORAGE_BUCKET')
  }
  if (config.appCheckMode === 'disabled-local') {
    issues.push('APP_CHECK_MODE')
  }
  if (containsDevelopmentPlaceholder(config.paymentProvider)) {
    issues.push('PAYMENT_PROVIDER')
  }
  if (containsDevelopmentPlaceholder(config.paymentWebhookSecret)) {
    issues.push('PAYMENT_WEBHOOK_SECRET')
  }
  if (containsDevelopmentPlaceholder(config.emailProvider)) {
    issues.push('EMAIL_PROVIDER')
  }
  if (containsDevelopmentPlaceholder(config.searchProvider)) {
    issues.push('SEARCH_PROVIDER')
  }
  if (containsDevelopmentPlaceholder(config.fileScanProvider)) {
    issues.push('FILE_SCAN_PROVIDER')
  }
  if (config.otelExporterEndpoint && containsDevelopmentPlaceholder(config.otelExporterEndpoint)) {
    issues.push('OTEL_EXPORTER_ENDPOINT')
  }

  if (issues.length > 0) {
    throw new Error(
      `Production Firebase configuration cannot use development placeholders: ${issues.join(', ')}`,
    )
  }
}

export function loadPublicClientConfig(
  env: EnvironmentInput = readRuntimeEnvironment(),
): PublicClientConfig {
  return toPublicClientConfig(
    parseEnvironment('Public client', publicClientEnvSchema, env, publicEnvKeys),
  )
}

export function loadServerConfig(
  env: EnvironmentInput = readRuntimeEnvironment(),
): ServerConfig {
  const config = toServerConfig(parseEnvironment('Server', serverEnvSchema, env, serverEnvKeys))

  assertProductionFirebaseConfiguration(config)
  return config
}

export function loadAppConfig(env: EnvironmentInput = readRuntimeEnvironment()): AppConfig {
  const server = loadServerConfig(env)

  return {
    client: loadPublicClientConfig(env),
    firebase: createFirebaseIdentityAdapterConfig({
      appBaseUrl: server.appBaseUrl,
      appEnv: server.appEnv,
      firebaseProjectId: server.firebaseProjectId,
    }),
    server,
  }
}
