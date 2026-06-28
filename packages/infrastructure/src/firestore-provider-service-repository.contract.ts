import { Firestore, Timestamp } from '@google-cloud/firestore'
import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import { describe, expect, it } from 'vitest'
import {
  createProviderServiceRepositoryHarnessForContract,
  runProviderServiceRepositoryContractSuite,
} from '../../testkit/src/provider-service-repository-contract.js'
import { createFirestoreProviderServiceRepository } from './firestore-provider-service-repository.js'

const projectId = 'demo-pim-3d-hub-local'
const firestore = new Firestore({ projectId })
let harnessCounter = 0
let mappingCounter = 0

function nextCollectionPrefix(scope: string): string {
  harnessCounter += 1
  return `${scope}_${String(harnessCounter).padStart(4, '0')}`
}

runProviderServiceRepositoryContractSuite({
  createHarness() {
    return createProviderServiceRepositoryHarnessForContract(({ clock, uuidGenerator }) => ({
      repository: createFirestoreProviderServiceRepository({
        clock,
        collectionPrefix: nextCollectionPrefix('provider_service_contract'),
        firestore,
        uuidGenerator,
      }),
    }))
  },
  name: 'ProviderServiceRepository contract: Firestore adapter',
})

describe('ProviderServiceRepository Firestore mapping', () => {
  it('stores canonical timestamps, null semantics, and version metadata', async () => {
    mappingCounter += 1

    const collectionPrefix = `provider_service_mapping_${String(mappingCounter).padStart(4, '0')}`
    const clock = {
      now: () => parseUtcTimestamp('2026-06-27T10:00:00.000Z'),
    }
    const uuidGenerator = {
      next: () => parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f7109'),
    }
    const repository = createFirestoreProviderServiceRepository({
      clock,
      collectionPrefix,
      firestore,
      uuidGenerator,
    })

    const created = await repository.create({
      leadTimeDays: 4,
      providerProfileId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f7110'),
      serviceDescription: 'ออกแบบงาน 3D',
      serviceName: 'Design Starter',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_ONLY',
      status: 'ACTIVE',
    })

    const createdSnapshot = await firestore
      .collection(`${collectionPrefix}_provider_services`)
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
      .collection(`${collectionPrefix}_provider_services`)
      .doc(created.id)
      .get()
    const deletedDocument = deletedSnapshot.data() as Record<string, unknown> | undefined

    expect(deleted.deletedAt).toBe('2026-06-27T10:00:00.000Z')
    expect(deletedDocument?.['deletedAt']).toBeInstanceOf(Timestamp)
    expect(deletedDocument?.['version']).toBe(2)
  })
})
