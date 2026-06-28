import { deleteApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { afterAll, describe, expect, it } from 'vitest'
import { AuthenticationRequiredError } from '@pim/application'
import { createFirebaseIdentityPort } from './firebase-identity-adapter.js'

const projectId = 'demo-pim-3d-hub-local'
const emulatorHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'] ?? '127.0.0.1:9099'

const adminApp = getApps().find((app) => app.name === 'pim-firebase-auth-emulator-test')
  ?? initializeApp({ projectId }, 'pim-firebase-auth-emulator-test')

const adminAuth = getAuth(adminApp)

async function callAuthEmulator(endpoint: string, payload: Record<string, unknown>) {
  const response = await fetch(
    `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/${endpoint}?key=fake-api-key`,
    {
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    },
  )

  if (!response.ok) {
    throw new Error(`Auth emulator request failed: ${response.status}`)
  }

  return response.json() as Promise<{
    email?: string
    idToken: string
    localId: string
  }>
}

afterAll(async () => {
  await deleteApp(adminApp)
})

describe('Firebase identity adapter', () => {
  it('verifies an emulator-issued token and maps safe claims', async () => {
    const email = `identity-${Date.now()}@example.com`
    const password = 'StrongPass123!'
    const signUpResult = await callAuthEmulator('accounts:signUp', {
      email,
      password,
      returnSecureToken: true,
    })

    await adminAuth.setCustomUserClaims(signUpResult.localId, {
      beta: true,
      role: 'buyer',
      tier: 2,
    })

    const signInResult = await callAuthEmulator('accounts:signInWithPassword', {
      email,
      password,
      returnSecureToken: true,
    })
    const adapter = createFirebaseIdentityPort({
      emulatorHost,
      projectId,
    })

    const identity = await adapter.verifyIdToken(signInResult.idToken)

    expect(identity).toMatchObject({
      email,
      emailVerified: false,
      provider: 'firebase',
      providerSubject: signUpResult.localId,
      safeClaims: {
        beta: true,
        role: 'buyer',
        tier: 2,
      },
    })
  })

  it('rejects invalid tokens with the stable authentication error', async () => {
    const adapter = createFirebaseIdentityPort({
      emulatorHost,
      projectId,
    })

    await expect(adapter.verifyIdToken('not-a-valid-token')).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    )
  })
})
