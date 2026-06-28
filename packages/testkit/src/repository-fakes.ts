import {
  parseUtcTimestamp,
  parseUuidv7,
  type CreateProviderProfileInput,
  type ProviderProfileStatus,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain'

export type ClockPort = Readonly<{
  now(): UtcTimestamp
}>

export type UuidGeneratorPort = Readonly<{
  next(): Uuidv7
}>

export type RecordedDomainEvent<TPayload = unknown> = Readonly<{
  aggregateId: Uuidv7
  occurredAt: UtcTimestamp
  payload: TPayload
  type: string
}>

export type FakeClock = ClockPort & {
  advanceMinutes(minutes: number): UtcTimestamp
  set(value: Date | string): UtcTimestamp
}

export type FakeUuidGenerator = UuidGeneratorPort & {
  enqueue(...values: readonly string[]): void
}

export type FakeDomainEventCollector<TPayload = unknown> = Readonly<{
  drain(): readonly RecordedDomainEvent<TPayload>[]
  record(event: RecordedDomainEvent<TPayload>): void
  snapshot(): readonly RecordedDomainEvent<TPayload>[]
}>

export function createFakeClock(initialValue = '2026-06-27T00:00:00.000Z'): FakeClock {
  let currentValue = parseUtcTimestamp(initialValue)

  return {
    advanceMinutes(minutes: number): UtcTimestamp {
      const next = new Date(currentValue)
      next.setUTCMinutes(next.getUTCMinutes() + minutes)
      currentValue = parseUtcTimestamp(next)
      return currentValue
    },
    now(): UtcTimestamp {
      return currentValue
    },
    set(value: Date | string): UtcTimestamp {
      currentValue = parseUtcTimestamp(value)
      return currentValue
    },
  }
}

export function createFakeUuidGenerator(
  values: readonly string[] = ['018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d13'],
): FakeUuidGenerator {
  const queue = values.map((value) => parseUuidv7(value))

  return {
    enqueue(...valuesToAdd: readonly string[]): void {
      for (const value of valuesToAdd) {
        queue.push(parseUuidv7(value))
      }
    },
    next(): Uuidv7 {
      const next = queue.shift()

      if (!next) {
        throw new RangeError('Fake UUID generator queue is empty')
      }

      return next
    },
  }
}

export function createFakeDomainEventCollector<TPayload = unknown>(): FakeDomainEventCollector<TPayload> {
  const events: RecordedDomainEvent<TPayload>[] = []

  return {
    drain(): readonly RecordedDomainEvent<TPayload>[] {
      return events.splice(0, events.length)
    },
    record(event: RecordedDomainEvent<TPayload>): void {
      events.push(event)
    },
    snapshot(): readonly RecordedDomainEvent<TPayload>[] {
      return [...events]
    },
  }
}

export function createProviderProfileInputFactory(defaults?: {
  ownerUserId?: Uuidv7
  publicNamePrefix?: string
  status?: ProviderProfileStatus
}) {
  let sequence = 0

  return (overrides?: Partial<CreateProviderProfileInput>): CreateProviderProfileInput => {
    sequence += 1

    return {
      ownerUserId:
        overrides?.ownerUserId ??
        defaults?.ownerUserId ??
        parseUuidv7(`018f18b2-4c4f-7c7a-9e12-4c0b8a8f6d${String(sequence).padStart(2, '0')}`),
      publicName:
        overrides?.publicName ??
        `${defaults?.publicNamePrefix ?? 'Provider'} ${String(sequence).padStart(2, '0')}`,
      status: overrides?.status ?? defaults?.status ?? 'ACTIVE',
      ...(overrides?.createdBy !== undefined ? { createdBy: overrides.createdBy } : {}),
      ...(overrides?.id !== undefined ? { id: overrides.id } : {}),
      ...(overrides?.updatedBy !== undefined ? { updatedBy: overrides.updatedBy } : {}),
    }
  }
}
