import { describe, expect, it } from 'vitest'
import {
  createFileAccessService,
  createStructuredLogger,
  type ResolveAuthenticatedUserUseCase,
} from '@pim/application'
import { parseUtcTimestamp, parseUuidv7, type UserRecord } from '@pim/domain'
import { createInMemoryUserRepository } from '../../../packages/infrastructure/src/index.js'
import {
  createFakeClock,
  createFakeUuidGenerator,
  createInMemoryFileAssetAccessGrantRepository,
  createInMemoryFileAssetRepository,
  createInMemoryServiceRequestRepository,
} from '../../../packages/testkit/src/index.js'
import { createAuthenticationMiddleware } from './authentication.js'
import { createFileAccessController } from './file-access.js'

function createUserRecord(id: string): UserRecord {
  return Object.freeze({
    createdAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
    createdBy: null,
    countryCode: 'TH',
    deletedAt: null,
    displayName: 'User',
    id: parseUuidv7(id),
    locale: 'th-TH',
    notificationPreferences: Object.freeze({
      marketingEmail: false,
      marketingPush: false,
      orderStatusEmail: true,
      orderStatusPush: true,
    }),
    onboardingCompletedAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
    onboardingRoleCode: 'BUYER',
    phoneE164: '+66812345678',
    privacyPreferences: Object.freeze({
      publicProfileVisible: true,
      shareAddressWithOrderParticipants: true,
      sharePhoneWithOrderParticipants: false,
      showProvince: true,
    }),
    profileImageAssetId: null,
    schemaVersion: 1,
    status: 'ACTIVE',
    updatedAt: parseUtcTimestamp('2026-06-28T10:00:00.000Z'),
    updatedBy: null,
    version: 1,
  })
}

function createResolver(user: UserRecord): ResolveAuthenticatedUserUseCase {
  return Object.freeze({
    async execute() {
      return {
        externalIdentity: {
          email: 'user@example.com',
          emailVerified: true,
          provider: 'firebase' as const,
          providerSubject: `firebase-${user.id}`,
          safeClaims: Object.freeze({ role: 'user' }),
        },
        identity: Object.freeze({
          createdAt: user.createdAt,
          createdBy: null,
          deletedAt: null,
          emailNormalized: 'user@example.com',
          emailVerified: true,
          id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd999'),
          provider: 'firebase',
          providerSubject: `firebase-${user.id}`,
          schemaVersion: 1,
          updatedAt: user.updatedAt,
          updatedBy: null,
          userId: user.id,
          version: 1,
        }),
        isNewUser: false,
        user,
      }
    },
  })
}

function createHarness(user: UserRecord, uuidIds: readonly string[] = []) {
  const clock = createFakeClock('2026-06-28T10:00:00.000Z')
  const users = createInMemoryUserRepository({ clock })
  const serviceRequests = createInMemoryServiceRequestRepository({ clock })
  const fileAssets = createInMemoryFileAssetRepository({ clock })
  const fileAssetAccessGrants = createInMemoryFileAssetAccessGrantRepository({ clock })

  const fileAccess = createFileAccessService({
    clock,
    fileAssetAccessGrants: fileAssetAccessGrants.repository,
    fileAssets: fileAssets.repository,
    serviceRequests: serviceRequests.repository,
    urlSigner: {
      async createSignedDownloadUrl(input) {
        return `https://signed.example/download/${input.assetId}`
      },
    },
    users,
    uuidGenerator: createFakeUuidGenerator(uuidIds),
  })

  const controller = createFileAccessController({
    authentication: createAuthenticationMiddleware({
      logger: createStructuredLogger({
        sink() {
          return undefined
        },
      }),
      resolver: createResolver(user),
    }),
    fileAccess,
  })

  return {
    controller,
    fileAccess,
    fileAssetAccessGrants,
    fileAssets,
    users,
  }
}

describe('file access API controller', () => {
  it('creates an access grant and returns a signed download response', async () => {
    const owner = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd001')
    const grantee = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd002')
    const harness = createHarness(owner, [
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd201',
      '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd202',
    ])

    await harness.users.create({ id: owner.id })
    await harness.users.create({ id: grantee.id })

    const asset = await harness.fileAccess.registerAsset({
      actorUserId: owner.id,
      mimeType: 'model/stl',
      objectKey: 'private/api/source.stl',
      originalFilename: 'source.stl',
      purpose: 'ORDER_FILE',
      sizeBytes: 512,
      storageProvider: 'gcs',
    })

    const createdGrant = await harness.controller.createAccessGrant({
      body: {
        contextId: '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd050',
        contextType: 'ORDER_PARTICIPANT',
        expiresAt: '2026-06-28T12:00:00.000Z',
        granteeUserId: grantee.id,
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        assetId: asset.id,
      },
    })

    expect(createdGrant).toMatchObject({
      body: {
        data: {
          assetId: asset.id,
          contextType: 'ORDER_PARTICIPANT',
          granteeUserId: grantee.id,
        },
      },
      status: 201,
    })

    const granteeHarness = createHarness(grantee)
    await granteeHarness.users.create({ id: owner.id })
    await granteeHarness.users.create({ id: grantee.id })
    await granteeHarness.fileAssets.repository.create({
      id: asset.id,
      mimeType: 'model/stl',
      objectKey: 'private/api/source.stl',
      originalFilename: 'source.stl',
      ownerUserId: owner.id,
      purpose: 'ORDER_FILE',
      sizeBytes: 512,
      storageProvider: 'gcs',
    })
    await granteeHarness.fileAssetAccessGrants.repository.create({
      assetId: asset.id,
      contextId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd050'),
      contextType: 'ORDER_PARTICIPANT',
      expiresAt: parseUtcTimestamp('2026-06-28T12:00:00.000Z'),
      grantedByUserId: owner.id,
      granteeUserId: grantee.id,
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd250'),
    })

    const access = await granteeHarness.controller.requestDownloadAccess({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        assetId: asset.id,
      },
    })

    expect(access).toMatchObject({
      body: {
        data: {
          assetId: asset.id,
          downloadUrl: `https://signed.example/download/${asset.id}`,
        },
      },
      status: 200,
    })
  })

  it('maps unauthorized access requests to 403', async () => {
    const user = createUserRecord('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd011')
    const harness = createHarness(user)

    await harness.users.create({ id: user.id })
    await harness.fileAssets.repository.create({
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd099'),
      mimeType: 'model/stl',
      objectKey: 'private/api/secret.stl',
      originalFilename: 'secret.stl',
      ownerUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-4c0b8a8fd098'),
      purpose: 'ORDER_FILE',
      sizeBytes: 100,
      storageProvider: 'gcs',
    })

    const result = await harness.controller.requestDownloadAccess({
      headers: {
        authorization: 'Bearer valid-token',
      },
      params: {
        assetId: '018f18b2-4c4f-7c7a-9e12-4c0b8a8fd099',
      },
    })

    expect(result).toMatchObject({
      body: {
        error: {
          code: 'AUTHORIZATION_DENIED',
        },
      },
      status: 403,
    })
  })
})
