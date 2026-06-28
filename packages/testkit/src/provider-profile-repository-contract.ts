import {
  RepositoryUniqueConstraintError,
  parseUuidv7,
  type ProviderProfileRepository,
} from '@pim/domain'
import { describe, expect, it } from 'vitest'
import {
  createFakeClock,
  createFakeUuidGenerator,
  createProviderProfileInputFactory,
  type FakeClock,
  type FakeUuidGenerator,
} from './repository-fakes.js'

export type ProviderProfileRepositoryHarness = Readonly<{
  clock: FakeClock
  repository: ProviderProfileRepository
  uuidGenerator: FakeUuidGenerator
}>

export function runProviderProfileRepositoryContractSuite(input: {
  createHarness(): ProviderProfileRepositoryHarness
  name: string
}): void {
  describe(input.name, () => {
    it('creates, reads, updates, and filters provider profiles deterministically', async () => {
      const harness = input.createHarness()
      const createProfile = createProviderProfileInputFactory()

      harness.uuidGenerator.enqueue(
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d21',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d22',
      )

      const first = await harness.repository.create(
        createProfile({
          ownerUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d01'),
          publicName: 'Bangkok Print Farm',
          status: 'ACTIVE',
        }),
      )

      harness.clock.advanceMinutes(5)

      const second = await harness.repository.create(
        createProfile({
          ownerUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d02'),
          publicName: 'Chiang Mai Prototype Lab',
          status: 'DRAFT',
        }),
      )

      const loaded = await harness.repository.findById(first.id)
      const byOwner = await harness.repository.findByOwnerUserId(second.ownerUserId)
      const activeOnly = await harness.repository.list({
        filter: { status: 'ACTIVE' },
        limit: 10,
        sort: { direction: 'desc', field: 'updatedAt' },
      })

      const updated = await harness.repository.update(
        {
          ...first,
          publicName: 'Bangkok Print Farm Plus',
          status: 'SUSPENDED',
        },
        first.version,
      )

      expect(loaded).toEqual(first)
      expect(byOwner).toEqual(second)
      expect(activeOnly.items.map((item) => item.id)).toEqual([first.id])
      expect(updated.publicName).toBe('Bangkok Print Farm Plus')
      expect(updated.version).toBe(first.version + 1)
    })

    it('returns the approved conflict when expectedVersion is stale', async () => {
      const harness = input.createHarness()
      const createProfile = createProviderProfileInputFactory()

      harness.uuidGenerator.enqueue('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d31')

      const created = await harness.repository.create(
        createProfile({
          ownerUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d03'),
        }),
      )

      const updated = await harness.repository.update(
        {
          ...created,
          publicName: 'Updated Name',
        },
        created.version,
      )

      await expect(
        harness.repository.update(
          {
            ...updated,
            publicName: 'Stale Update',
          },
          created.version,
        ),
      ).rejects.toMatchObject({
        actualVersion: updated.version,
        code: 'RESOURCE_VERSION_CONFLICT',
        expectedVersion: created.version,
        name: 'RepositoryConflictError',
      })
    })

    it('keeps pagination stable for equal sort values by using the id tie-breaker', async () => {
      const harness = input.createHarness()
      const createProfile = createProviderProfileInputFactory()

      harness.clock.set('2026-06-27T10:00:00.000Z')
      harness.uuidGenerator.enqueue(
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d11',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d12',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d13',
      )

      const owners = [
        parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d41'),
        parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d42'),
        parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d43'),
      ]

      for (const ownerUserId of owners) {
        await harness.repository.create(createProfile({ ownerUserId }))
      }

      const firstPage = await harness.repository.list({
        limit: 2,
        sort: { direction: 'desc', field: 'updatedAt' },
      })
      const secondPage = await harness.repository.list({
        limit: 2,
        sort: { direction: 'desc', field: 'updatedAt' },
        ...(firstPage.nextCursor ? { cursor: firstPage.nextCursor } : {}),
      })

      expect(firstPage.items.map((item) => item.id)).toEqual([
        parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d11'),
        parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d12'),
      ])
      expect(secondPage.items.map((item) => item.id)).toEqual([
        parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d13'),
      ])
      expect(secondPage.nextCursor).toBeNull()
    })

    it('soft deletes records from default reads and frees the active uniqueness slot', async () => {
      const harness = input.createHarness()
      const createProfile = createProviderProfileInputFactory()
      const ownerUserId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d51')

      harness.uuidGenerator.enqueue(
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d52',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d53',
      )

      const created = await harness.repository.create(createProfile({ ownerUserId }))
      const deleted = await harness.repository.softDelete(created.id, created.version)
      const hidden = await harness.repository.findById(created.id)
      const included = await harness.repository.findById(created.id, {
        includeDeleted: true,
      })
      const recreated = await harness.repository.create(
        createProfile({
          ownerUserId,
          publicName: 'Replacement Profile',
        }),
      )

      expect(deleted.deletedAt).not.toBeNull()
      expect(hidden).toBeNull()
      expect(included?.deletedAt).not.toBeNull()
      expect(recreated.ownerUserId).toBe(ownerUserId)
    })

    it('rejects active uniqueness collisions', async () => {
      const harness = input.createHarness()
      const createProfile = createProviderProfileInputFactory()
      const ownerUserId = parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d61')

      harness.uuidGenerator.enqueue(
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d62',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d63',
      )

      await harness.repository.create(createProfile({ ownerUserId }))

      await expect(
        harness.repository.create(
          createProfile({
            ownerUserId,
            publicName: 'Duplicate Owner Profile',
          }),
        ),
      ).rejects.toBeInstanceOf(RepositoryUniqueConstraintError)
    })
  })
}

export function createProviderProfileRepositoryHarnessForContract(
  repositoryFactory: (input: {
    clock: FakeClock
    uuidGenerator: FakeUuidGenerator
  }) => Readonly<{
    repository: ProviderProfileRepository
  }>,
): ProviderProfileRepositoryHarness {
  const clock = createFakeClock()
  const uuidGenerator = createFakeUuidGenerator([])
  const { repository } = repositoryFactory({ clock, uuidGenerator })

  return {
    clock,
    repository,
    uuidGenerator,
  }
}
