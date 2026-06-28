export type FirebaseEnvironmentName = 'local' | 'development' | 'staging' | 'production'

export type FirebaseAuthProvider = 'emailPassword' | 'google' | 'apple' | 'phone'

export type FirebaseEnvironmentReference = Readonly<{
  deploymentAlias: FirebaseEnvironmentName
  environment: FirebaseEnvironmentName
  owner: string
  projectId: string
}>

export type FirebaseEnvironmentMatrix = Readonly<Record<FirebaseEnvironmentName, FirebaseEnvironmentReference>>

export type FirebaseIdentityAdapterConfig = Readonly<{
  authorizedDomains: readonly string[]
  emulatorHost: string | null
  environment: FirebaseEnvironmentReference
  projectId: string
  redirectUrls: readonly string[]
  supportedAuthProviders: readonly FirebaseAuthProvider[]
  testFlowProviders: readonly FirebaseAuthProvider[]
}>

export type FirebaseIdentityAdapterInput = Readonly<{
  appBaseUrl: string
  appEnv: FirebaseEnvironmentName
  firebaseProjectId: string
}>

const supportedAuthProviders = Object.freeze([
  'emailPassword',
  'google',
  'apple',
  'phone',
] as const)

const localTestFlowProviders = Object.freeze(['emailPassword', 'phone'] as const)

export const firebaseEnvironmentMatrix: FirebaseEnvironmentMatrix = Object.freeze({
  development: Object.freeze({
    deploymentAlias: 'development',
    environment: 'development',
    owner: 'platform-engineering',
    projectId: 'pim-3d-hub-development',
  }),
  local: Object.freeze({
    deploymentAlias: 'local',
    environment: 'local',
    owner: 'platform-engineering',
    projectId: 'demo-pim-3d-hub-local',
  }),
  production: Object.freeze({
    deploymentAlias: 'production',
    environment: 'production',
    owner: 'platform-owner',
    projectId: 'pim-3d-hub-production',
  }),
  staging: Object.freeze({
    deploymentAlias: 'staging',
    environment: 'staging',
    owner: 'release-engineering',
    projectId: 'pim-3d-hub-staging',
  }),
})

function createRedirectUrl(appBaseUrl: string): string {
  return new URL('/auth/callback', appBaseUrl).toString()
}

function createAuthorizedDomains(appBaseUrl: string, appEnv: FirebaseEnvironmentName): string[] {
  const hostname = new URL(appBaseUrl).hostname

  if (appEnv === 'local') {
    return ['127.0.0.1', 'localhost']
  }

  return [hostname]
}

export function createFirebaseIdentityAdapterConfig(
  input: FirebaseIdentityAdapterInput,
): FirebaseIdentityAdapterConfig {
  const environment = firebaseEnvironmentMatrix[input.appEnv]

  return Object.freeze({
    authorizedDomains: createAuthorizedDomains(input.appBaseUrl, input.appEnv),
    emulatorHost: input.appEnv === 'local' ? '127.0.0.1:9099' : null,
    environment,
    projectId: input.firebaseProjectId,
    redirectUrls: [createRedirectUrl(input.appBaseUrl)],
    supportedAuthProviders,
    testFlowProviders: input.appEnv === 'local' ? localTestFlowProviders : supportedAuthProviders,
  })
}
