import { describe, expect, it } from 'vitest'
import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import {
  createFakeClock,
  createFakeDomainEventCollector,
  createFakeUuidGenerator,
} from './repository-fakes.js'

describe('deterministic repository fakes', () => {
  it('provides a controllable clock and queued UUID values', () => {
    const clock = createFakeClock('2026-06-27T00:00:00.000Z')
    const uuids = createFakeUuidGenerator(['018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d81'])

    expect(clock.now()).toBe('2026-06-27T00:00:00.000Z')
    expect(clock.advanceMinutes(15)).toBe('2026-06-27T00:15:00.000Z')
    expect(uuids.next()).toBe('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d81')
  })

  it('records and drains domain events deterministically', () => {
    const collector = createFakeDomainEventCollector<{ status: string }>()

    collector.record({
      aggregateId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d82'),
      occurredAt: parseUtcTimestamp('2026-06-27T00:00:00.000Z'),
      payload: {
        status: 'ACTIVE',
      },
      type: 'provider-profile.created',
    })

    expect(collector.snapshot()).toHaveLength(1)
    expect(collector.drain()).toHaveLength(1)
    expect(collector.snapshot()).toHaveLength(0)
  })
})
