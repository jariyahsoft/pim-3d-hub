import { Firestore, Timestamp } from '@google-cloud/firestore'
import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import { describe, expect, it } from 'vitest'
import {
  createProviderProfileRepositoryHarnessForContract,
  runProviderProfileRepositoryContractSuite,
} from '../../testkit/src/provider-profile-repository-contract.js'
import { createFirestoreProviderProfileRepository } from './firestore-provider-profile-repository.js'

const projectId = 'demo-pim-3d-hub-local'
const firestore = new Firestore({ projectId })
let harnessCounter = 0
let mappingCounter = 0

function nextCollectionPrefix(scope: string): string {
  harnessCounter += 1
  return `${scope}_${String(harnessCounter).padStart(4, '0')}`
}

runProviderProfileRepositoryContractSuite({
  createHarness() {
    return createProviderProfileRepositoryHarnessForContract(({ clock, uuidGenerator }) => ({
      repository: createFirestoreProviderProfileRepository({
        clock,
        collectionPrefix: nextCollectionPrefix('provider_profile_contract'),
        firestore,
        uuidGenerator,
      }),
    }))
  },
  name: 'ProviderProfileRepository contract: Firestore adapter',
})

describe('ProviderProfileRepository Firestore mapping', () => {
  it('stores canonical timestamps, null semantics, and version metadata', async () => {
    mappingCounter += 1

    const collectionPrefix = `provider_profile_mapping_${String(mappingCounter).padStart(4, '0')}`
    const clock = {
      now: () => parseUtcTimestamp('2026-06-27T10:00:00.000Z'),
    }
    const uuidGenerator = {
      next: () => parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6e01'),
    }
    const repository = createFirestoreProviderProfileRepository({
      clock,
      collectionPrefix,
      firestore,
      uuidGenerator,
    })

    const created = await repository.create({
      ownerUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6e11'),
      publicName: 'Mapping Verification Farm',
      status: 'ACTIVE',
    })

    const createdSnapshot = await firestore
      .collection(`${collectionPrefix}_provider_profiles`)
      .doc(created.id)
      .get()
    const createdDocument = createdSnapshot.data() as Record<string, unknown> | undefined

    expect(createdDocument?.['createdAt']).toBeInstanceOf(Timestamp)
    expect(createdDocument?.['updatedAt']).toBeInstanceOf(Timestamp)
    expect(createdDocument?.['deletedAt']).toBeNull()
    expect(createdDocument?.['createdBy']).toBeNull()
    expect(createdDocument?.['updatedBy']).toBeNull()
    expect(createdDocument?.['version']).toBe(1)

    const deleted = await repository.softDelete(created.id, created.version)

    const deletedSnapshot = await firestore
      .collection(`${collectionPrefix}_provider_profiles`)
      .doc(created.id)
      .get()
    const deletedDocument = deletedSnapshot.data() as Record<string, unknown> | undefined

    expect(deleted.deletedAt).toBe('2026-06-27T10:00:00.000Z')
    expect(deletedDocument?.['deletedAt']).toBeInstanceOf(Timestamp)
    expect(deletedDocument?.['version']).toBe(2)
  })
})
