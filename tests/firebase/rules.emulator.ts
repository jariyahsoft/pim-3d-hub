import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'

const projectId = 'demo-pim-3d-hub-local'
const bucketName = `${projectId}.appspot.com`
const firestoreRules = readFileSync(resolve('firebase/firestore.rules'), 'utf8')
const storageRules = readFileSync(resolve('firebase/storage.rules'), 'utf8')

const privatePath = 'private/file_asset_private/source.stl'
const publicPath = 'public-content/file_asset_public/derived-preview.txt'
const otherPublicPath = 'public/file_asset_public/not-approved.txt'

let testEnv: RulesTestEnvironment

async function seedFixtures(): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const storage = context.storage(`gs://${bucketName}`)

    await db.doc('orders/order_seeded').set({
      buyerId: 'user_buyer',
      status: 'PAID',
      updatedAt: '2026-06-27T00:00:00.000Z',
    })

    await storage.ref(privatePath).putString('solid-model')
    await storage.ref(publicPath).putString('derived-preview')
  })
}

async function cleanupFixtures(): Promise<void> {
  await testEnv.clearFirestore()
  await testEnv.clearStorage()
}

describe('firebase deny-by-default rules baseline', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: firestoreRules,
      },
      storage: {
        host: '127.0.0.1',
        port: 9199,
        rules: storageRules,
      },
    })
  })

  beforeEach(async () => {
    await cleanupFixtures()
    await seedFixtures()
  })

  afterAll(async () => {
    await cleanupFixtures()
    await testEnv.cleanup()
  })

  it('denies authenticated users from reading and writing orders directly', async () => {
    const db = testEnv.authenticatedContext('user_regular').firestore()

    await assertFails(db.doc('orders/order_seeded').get())
    await assertFails(
      db.doc('orders/order_direct_write').set({
        buyerId: 'user_regular',
        status: 'DRAFT',
      }),
    )
  })

  it('denies unauthenticated users from reading business collections', async () => {
    const db = testEnv.unauthenticatedContext().firestore()

    await assertFails(db.doc('orders/order_seeded').get())
  })

  it('allows public derived content reads only from the approved path', async () => {
    const publicReader = testEnv.unauthenticatedContext().storage(`gs://${bucketName}`)

    await expect(
      assertSucceeds(publicReader.ref(publicPath).getDownloadURL()),
    ).resolves.toMatch(/^http/)
    await assertFails(publicReader.ref(otherPublicPath).getDownloadURL())
    await assertFails(publicReader.ref(publicPath).putString('attempted-overwrite'))
  })

  it('denies direct reads of private source objects to authenticated users', async () => {
    const storage = testEnv.authenticatedContext('user_regular').storage(`gs://${bucketName}`)

    await assertFails(storage.ref(privatePath).getDownloadURL())
  })
})
