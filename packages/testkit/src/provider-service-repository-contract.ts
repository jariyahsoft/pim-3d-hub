import { RepositoryUniqueConstraintError, parseUuidv7, type ProviderServiceRepository } from '@pim/domain'
import { describe, expect, it } from 'vitest'
import {
  createFakeClock,
  createFakeUuidGenerator,
  type FakeClock,
  type FakeUuidGenerator,
} from './repository-fakes.js'

export type ProviderServiceRepositoryHarness = Readonly<{
  clock: FakeClock
  repository: ProviderServiceRepository
  uuidGenerator: FakeUuidGenerator
}>

function createServiceInputFactory() {
  return (overrides: Partial<Parameters<ProviderServiceRepository['create']>[0]> = {}) =>
    Object.freeze({
      leadTimeDays: 3,
      providerProfileId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f7101'),
      serviceDescription: 'รับออกแบบและเตรียมไฟล์ก่อนพิมพ์',
      serviceName: 'งานออกแบบเริ่มต้น',
      serviceRegion: 'กรุงเทพมหานคร',
      serviceType: 'DESIGN_ONLY' as const,
      ...overrides,
    })
}

export function runProviderServiceRepositoryContractSuite(input: {
  createHarness(): ProviderServiceRepositoryHarness
  name: string
}): void {
  describe(input.name, () => {
    it('creates, reads, updates, and filters provider services deterministically', async () => {
      const harness = input.createHarness()
      const createService = createServiceInputFactory()

      harness.uuidGenerator.enqueue(
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f7102',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f7103',
      )

      const first = await harness.repository.create(
        createService({
          serviceType: 'DESIGN_ONLY',
          status: 'ACTIVE',
        }),
      )

      harness.clock.advanceMinutes(5)

      const second = await harness.repository.create(
        createService({
          providerProfileId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f7102'),
          serviceName: 'งานพิมพ์เรซิน',
          serviceType: 'PRINT_ONLY',
        }),
      )

      const loaded = await harness.repository.findById(first.id)
      const bySlot = await harness.repository.findByProviderProfileAndType(
        second.providerProfileId,
        second.serviceType,
      )
      const activeOnly = await harness.repository.list({
        filter: { status: 'ACTIVE' },
        limit: 10,
        sort: { direction: 'desc', field: 'updatedAt' },
      })

      const updated = await harness.repository.update(
        {
          ...first,
          serviceDescription: 'อัปเดตคำอธิบาย',
          status: 'PAUSED',
        },
        first.version,
      )

      expect(loaded).toEqual(first)
      expect(bySlot).toEqual(second)
      expect(activeOnly.items.map((item) => item.id)).toEqual([first.id])
      expect(updated.serviceDescription).toBe('อัปเดตคำอธิบาย')
      expect(updated.version).toBe(first.version + 1)
    })

    it('rejects providerProfileId and serviceType uniqueness collisions', async () => {
      const harness = input.createHarness()
      const createService = createServiceInputFactory()

      harness.uuidGenerator.enqueue(
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f7111',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f7112',
      )

      const inputRecord = createService({
        providerProfileId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f7110'),
        serviceType: 'DESIGN_AND_PRINT',
      })

      await harness.repository.create(inputRecord)

      await expect(harness.repository.create(inputRecord)).rejects.toBeInstanceOf(
        RepositoryUniqueConstraintError,
      )
    })

    it('soft deletes records from default reads and frees the active slot', async () => {
      const harness = input.createHarness()
      const createService = createServiceInputFactory()

      harness.uuidGenerator.enqueue(
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f7121',
        '018f18b2-4c4f-7c7a-9e12-4c0b8a8f7122',
      )

      const created = await harness.repository.create(
        createService({
          providerProfileId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f7120'),
          serviceType: 'PRINT_ONLY',
        }),
      )

      const deleted = await harness.repository.softDelete(created.id, created.version)
      const hidden = await harness.repository.findById(created.id)
      const included = await harness.repository.findById(created.id, {
        includeDeleted: true,
      })
      const recreated = await harness.repository.create(
        createService({
          providerProfileId: created.providerProfileId,
          serviceType: created.serviceType,
        }),
      )

      expect(deleted.deletedAt).not.toBeNull()
      expect(hidden).toBeNull()
      expect(included?.deletedAt).not.toBeNull()
      expect(recreated.providerProfileId).toBe(created.providerProfileId)
    })
  })
}

export function createProviderServiceRepositoryHarnessForContract(
  repositoryFactory: (input: {
    clock: FakeClock
    uuidGenerator: FakeUuidGenerator
  }) => Readonly<{
    repository: ProviderServiceRepository
  }>,
): ProviderServiceRepositoryHarness {
  const clock = createFakeClock()
  const uuidGenerator = createFakeUuidGenerator([])
  const { repository } = repositoryFactory({ clock, uuidGenerator })

  return {
    clock,
    repository,
    uuidGenerator,
  }
}
