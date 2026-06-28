import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import {
  AuthenticationRequiredError,
  type ExternalIdentity,
  type IdentityPort,
  type SafeIdentityClaimValue,
} from '@pim/application'

type FirebaseIdentityAdapterOptions = Readonly<{
  appName?: string
  clientEmail?: string
  emulatorHost?: string | null
  privateKey?: string
  projectId: string
}>

const reservedClaimKeys = new Set([
  'aud',
  'auth_time',
  'email',
  'email_verified',
  'exp',
  'firebase',
  'iat',
  'iss',
  'phone_number',
  'picture',
  'sub',
  'uid',
  'user_id',
])

function createAppName(input: FirebaseIdentityAdapterOptions): string {
  const rawName = input.appName ??
    `pim-firebase-auth-${input.projectId}-${input.emulatorHost ? 'emulator' : 'server'}`

  return rawName.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function getOrCreateFirebaseApp(input: FirebaseIdentityAdapterOptions) {
  const appName = createAppName(input)
  const existing = getApps().find((app) => app.name === appName)

  if (existing) {
    return getApp(appName)
  }

  if (input.emulatorHost) {
    return initializeApp(
      {
        projectId: input.projectId,
      },
      appName,
    )
  }

  if (!input.clientEmail || !input.privateKey) {
    throw new TypeError('Firebase identity adapter requires service-account credentials')
  }

  return initializeApp(
    {
      credential: cert({
        clientEmail: input.clientEmail,
        privateKey: input.privateKey,
        projectId: input.projectId,
      }),
      projectId: input.projectId,
    },
    appName,
  )
}

function toSafeClaims(decodedToken: DecodedIdToken): Readonly<Record<string, SafeIdentityClaimValue>> {
  const safeClaims: Record<string, SafeIdentityClaimValue> = {}

  for (const [key, value] of Object.entries(decodedToken)) {
    if (reservedClaimKeys.has(key)) {
      continue
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      safeClaims[key] = value
    }
  }

  const signInProvider = decodedToken.firebase?.sign_in_provider

  if (typeof signInProvider === 'string' && signInProvider.trim().length > 0) {
    safeClaims['signInProvider'] = signInProvider
  }

  return Object.freeze(safeClaims)
}

function toExternalIdentity(decodedToken: DecodedIdToken): ExternalIdentity {
  return Object.freeze({
    email: decodedToken.email ?? null,
    emailVerified: decodedToken.email_verified === true,
    provider: 'firebase',
    providerSubject: decodedToken.uid,
    safeClaims: toSafeClaims(decodedToken),
  })
}

export function createFirebaseIdentityPort(
  input: FirebaseIdentityAdapterOptions,
): IdentityPort {
  const app = getOrCreateFirebaseApp(input)
  const auth = getAuth(app)

  return Object.freeze({
    async verifyIdToken(idToken: string): Promise<ExternalIdentity> {
      if (!idToken.trim()) {
        throw new AuthenticationRequiredError()
      }

      if (input.emulatorHost) {
        process.env['FIREBASE_AUTH_EMULATOR_HOST'] = input.emulatorHost
      }

      try {
        const decodedToken = await auth.verifyIdToken(idToken)
        return toExternalIdentity(decodedToken)
      } catch {
        throw new AuthenticationRequiredError()
      }
    },
  })
}
