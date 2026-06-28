import { describe, expect, it } from 'vitest'
import { type ExternalIdentity } from './identity.js'
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  createResolveAuthenticatedUserUseCase,
} from './identity.js'
import { parseUuidv7 } from '@pim/domain'
import {
  createFakeClock,
  createFakeDomainEventCollector,
  createFakeUuidGenerator,
} from '../../testkit/src/repository-fakes.js'
import {
  createInMemoryUserIdentityRepository,
  createInMemoryUserRepository,
} from '../../infrastructure/src/in-memory-user-repositories.js'

function createExternalIdentity(overrides?: Partial<ExternalIdentity>): ExternalIdentity {
  return Object.freeze({
    email: overrides?.email ?? 'person@example.com',
    emailVerified: overrides?.emailVerified ?? true,
    provider: 'firebase',
    providerSubject: overrides?.providerSubject ?? 'firebase-user-001',
    safeClaims: overrides?.safeClaims ?? Object.freeze({ role: 'buyer' }),
  })
}

describe('resolve authenticated user use case', () => {
  it('creates a stable internal user and identity on first login', async () => {
    const clock = createFakeClock('2026-06-27T12:00:00.000Z')
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8001',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8002',
    ])
    const auditCollector = createFakeDomainEventCollector()
    const users = createInMemoryUserRepository({ clock })
    const userIdentities = createInMemoryUserIdentityRepository({ clock })
    const useCase = createResolveAuthenticatedUserUseCase({
      auditSink: {
        record(event) {
          auditCollector.record({
            aggregateId: event.userId ?? parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8fff'),
            occurredAt: event.occurredAt,
            payload: event.details,
            type: event.type,
          })
        },
      },
      clock,
      identityPort: {
        async verifyIdToken() {
          return createExternalIdentity()
        },
      },
      userIdentities,
      users,
      uuidGenerator,
    })

    const result = await useCase.execute({ idToken: 'valid-token' })

    expect(result.isNewUser).toBe(true)
    expect(result.user.id).toBe('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8001')
    expect(result.identity.id).toBe('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8002')
    expect(result.identity.emailNormalized).toBe('person@example.com')
    expect(users.snapshot()).toHaveLength(1)
    expect(userIdentities.snapshot()).toHaveLength(1)
    expect(auditCollector.snapshot()).toMatchObject([
      {
        type: 'identity.user.onboarded',
      },
    ])
  })

  it('returns the same internal user on repeat login without duplicates', async () => {
    const clock = createFakeClock('2026-06-27T12:00:00.000Z')
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8011',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8012',
    ])
    const users = createInMemoryUserRepository({ clock })
    const userIdentities = createInMemoryUserIdentityRepository({ clock })
    const useCase = createResolveAuthenticatedUserUseCase({
      clock,
      identityPort: {
        async verifyIdToken() {
          return createExternalIdentity()
        },
      },
      userIdentities,
      users,
      uuidGenerator,
    })

    const first = await useCase.execute({ idToken: 'valid-token' })
    clock.advanceMinutes(10)
    const second = await useCase.execute({ idToken: 'valid-token' })

    expect(first.user.id).toBe(second.user.id)
    expect(second.isNewUser).toBe(false)
    expect(users.snapshot()).toHaveLength(1)
    expect(userIdentities.snapshot()).toHaveLength(1)
  })

  it('deduplicates concurrent first login attempts for the same external identity', async () => {
    const clock = createFakeClock('2026-06-27T12:00:00.000Z')
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8021',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8022',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8023',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8024',
    ])
    const firstCreateController: {
      release: () => void
    } = {
      release() {
        return undefined
      },
    }
    let createCount = 0
    const firstCreateGate = new Promise<void>((resolve) => {
      firstCreateController.release = resolve
    })
    const users = createInMemoryUserRepository({
      clock,
      onBeforeCreate: async () => {
        createCount += 1

        if (createCount === 1) {
          await firstCreateGate
        }
      },
    })
    const userIdentities = createInMemoryUserIdentityRepository({ clock })
    const useCase = createResolveAuthenticatedUserUseCase({
      clock,
      identityPort: {
        async verifyIdToken() {
          return createExternalIdentity({
            providerSubject: 'firebase-user-race',
          })
        },
      },
      userIdentities,
      users,
      uuidGenerator,
    })

    const firstPromise = useCase.execute({ idToken: 'token-race-1' })
    await Promise.resolve()
    const secondPromise = useCase.execute({ idToken: 'token-race-2' })
    firstCreateController.release()

    const [first, second] = await Promise.all([firstPromise, secondPromise])

    expect(first.user.id).toBe(second.user.id)
    expect(users.snapshot()).toHaveLength(1)
    expect(userIdentities.snapshot()).toHaveLength(1)
  })

  it('raises authentication required for invalid tokens without recording token data', async () => {
    const clock = createFakeClock('2026-06-27T12:00:00.000Z')
    const uuidGenerator = createFakeUuidGenerator([])
    const auditCollector = createFakeDomainEventCollector()
    const useCase = createResolveAuthenticatedUserUseCase({
      auditSink: {
        record(event) {
          auditCollector.record({
            aggregateId: event.userId ?? parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8ffe'),
            occurredAt: event.occurredAt,
            payload: event.details,
            type: event.type,
          })
        },
      },
      clock,
      identityPort: {
        async verifyIdToken() {
          throw new AuthenticationRequiredError()
        },
      },
      userIdentities: createInMemoryUserIdentityRepository({ clock }),
      users: createInMemoryUserRepository({ clock }),
      uuidGenerator,
    })

    await expect(useCase.execute({ idToken: 'sensitive-token-value' })).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    )

    expect(auditCollector.snapshot()).toMatchObject([
      {
        payload: {
          provider: 'firebase',
          reason: 'INVALID_TOKEN',
        },
        type: 'security.identity.authentication_failed',
      },
    ])
    expect(JSON.stringify(auditCollector.snapshot())).not.toContain('sensitive-token-value')
  })

  it('rejects suspended users and records a security event', async () => {
    const clock = createFakeClock('2026-06-27T12:00:00.000Z')
    const uuidGenerator = createFakeUuidGenerator([
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8031',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8f8032',
    ])
    const auditCollector = createFakeDomainEventCollector()
    const users = createInMemoryUserRepository({ clock })
    const userIdentities = createInMemoryUserIdentityRepository({ clock })
    const useCase = createResolveAuthenticatedUserUseCase({
      auditSink: {
        record(event) {
          auditCollector.record({
            aggregateId: event.userId ?? parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8f8ffd'),
            occurredAt: event.occurredAt,
            payload: event.details,
            type: event.type,
          })
        },
      },
      clock,
      identityPort: {
        async verifyIdToken() {
          return createExternalIdentity()
        },
      },
      userIdentities,
      users,
      uuidGenerator,
    })

    const first = await useCase.execute({ idToken: 'valid-token' })
    await users.update(
      {
        ...first.user,
        status: 'SUSPENDED',
      },
      first.user.version,
    )

    await expect(useCase.execute({ idToken: 'valid-token' })).rejects.toBeInstanceOf(
      AuthorizationDeniedError,
    )

    expect(auditCollector.snapshot()).toMatchObject([
      { type: 'identity.user.onboarded' },
      {
        payload: {
          reason: 'USER_SUSPENDED',
          status: 'SUSPENDED',
        },
        type: 'security.identity.access_denied',
      },
    ])
  })
})
