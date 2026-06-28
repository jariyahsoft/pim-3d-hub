import { describe, expect, it } from 'vitest'
import { AuthorizationDeniedError, type AuditEvent } from './identity.js'
import { createFileAccessService } from './file-access.js'
import { createServiceRequestService } from './service-request.js'
import { parseUtcTimestamp, parseUuidv7 } from '@pim/domain'
import {
  createInMemoryUserRepository,
  createInMemoryUserRoleRepository,
} from '../../infrastructure/src/index.js'
import {
  createFakeClock,
  createFakeUuidGenerator,
  createInMemoryFileAssetAccessGrantRepository,
  createInMemoryFileAssetRepository,
  createInMemoryServiceRequestRepository,
} from '../../testkit/src/index.js'

function createUserId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`)
}

function createHarness(uuidIds: readonly string[] = []) {
  const clock = createFakeClock('2026-06-28T10:00:00.000Z')
  const users = createInMemoryUserRepository({ clock })
  const userRoles = createInMemoryUserRoleRepository({ clock })
  const serviceRequests = createInMemoryServiceRequestRepository({ clock })
  const fileAssets = createInMemoryFileAssetRepository({ clock })
  const fileAssetAccessGrants = createInMemoryFileAssetAccessGrantRepository({ clock })
  const auditEvents: AuditEvent[] = []
  const signedUrls: string[] = []
  const uuidGenerator = createFakeUuidGenerator(uuidIds)

  const serviceRequestsService = createServiceRequestService({
    clock,
    fileAssetAccessGrants: fileAssetAccessGrants.repository,
    serviceRequests: serviceRequests.repository,
    userRoles,
    users,
    uuidGenerator,
  })

  const fileAccess = createFileAccessService({
    auditSink: {
      record(event) {
        auditEvents.push(event)
      },
    },
    clock,
    fileAssetAccessGrants: fileAssetAccessGrants.repository,
    fileAssets: fileAssets.repository,
    serviceRequests: serviceRequests.repository,
    urlSigner: {
      async createSignedDownloadUrl(input) {
        const url = `https://signed.example/files/${input.assetId}?token=sensitive-download-token`
        signedUrls.push(url)
        return url
      },
    },
    users,
    uuidGenerator,
  })

  return {
    auditEvents,
    clock,
    fileAccess,
    fileAssetAccessGrants,
    fileAssets,
    serviceRequestsService,
    signedUrls,
    userRoles,
    users,
  }
}

async function createActiveUser(
  harness: ReturnType<typeof createHarness>,
  userId: ReturnType<typeof parseUuidv7>,
) {
  await harness.users.create({ id: userId })
}

async function createBuyerRole(
  harness: ReturnType<typeof createHarness>,
  userId: ReturnType<typeof parseUuidv7>,
  roleId: ReturnType<typeof parseUuidv7>,
) {
  await harness.userRoles.create({
    activatedAt: harness.clock.now(),
    createdBy: userId,
    id: roleId,
    roleCode: 'BUYER',
    scopeType: 'GLOBAL',
    status: 'ACTIVE',
    updatedBy: userId,
    userId,
  })
}

describe('file access service', () => {
  it('allows owner and invited provider access without leaking signed urls into audit logs', async () => {
    const harness = createHarness([
      createUserId('201'),
      createUserId('202'),
      createUserId('203'),
    ])
    const buyerId = createUserId('001')
    const providerId = createUserId('002')

    await createActiveUser(harness, buyerId)
    await createActiveUser(harness, providerId)
    await createBuyerRole(harness, buyerId, createUserId('101'))

    const asset = await harness.fileAccess.registerAsset({
      actorUserId: buyerId,
      mimeType: 'model/stl',
      objectKey: 'private/request-1/source.stl',
      originalFilename: 'source.stl',
      purpose: 'SERVICE_REQUEST_SOURCE',
      sizeBytes: 2048,
      storageProvider: 'gcs',
    })

    const draft = await harness.serviceRequestsService.createDraft({
      actorUserId: buyerId,
      attachments: [
        {
          assetId: asset.id,
          mimeType: asset.mimeType,
          originalFilename: asset.originalFilename,
          sizeBytes: asset.sizeBytes,
        },
      ],
      budgetCurrency: 'THB',
      budgetMinor: 15000,
      description: 'Invite-only mold design',
      dueAt: parseUtcTimestamp('2026-07-05T10:00:00.000Z'),
      prohibitedWorkAcknowledged: true,
      serviceRegion: 'Bangkok',
      serviceType: 'DESIGN_ONLY',
      title: 'Private redesign',
      visibility: 'INVITE_ONLY',
    })
    await harness.serviceRequestsService.publishRequest({
      actorUserId: buyerId,
      expectedVersion: draft.version,
      requestId: draft.id,
    })

    const grant = await harness.fileAccess.createAccessGrant({
      actorUserId: buyerId,
      assetId: asset.id,
      contextId: draft.id,
      contextType: 'SERVICE_REQUEST_INVITE',
      expiresAt: parseUtcTimestamp('2026-06-28T12:00:00.000Z'),
      granteeUserId: providerId,
    })

    const ownerAccess = await harness.fileAccess.requestDownloadAccess({
      actorUserId: buyerId,
      assetId: asset.id,
    })
    const invitedAccess = await harness.fileAccess.requestDownloadAccess({
      actorUserId: providerId,
      assetId: asset.id,
    })

    expect(grant.contextType).toBe('SERVICE_REQUEST_INVITE')
    expect(ownerAccess.expiresAt).toBe('2026-06-28T10:10:00.000Z')
    expect(invitedAccess.downloadUrl).toContain(asset.id)
    expect(JSON.stringify(harness.auditEvents)).not.toContain(harness.signedUrls[0] ?? '')
    expect(JSON.stringify(harness.auditEvents)).not.toContain('sensitive-download-token')
  })

  it('denies unrelated, expired, and revoked users from requesting download access', async () => {
    const harness = createHarness([createUserId('211'), createUserId('212')])
    const buyerId = createUserId('011')
    const invitedId = createUserId('012')
    const unrelatedId = createUserId('013')

    await createActiveUser(harness, buyerId)
    await createActiveUser(harness, invitedId)
    await createActiveUser(harness, unrelatedId)

    const asset = await harness.fileAccess.registerAsset({
      actorUserId: buyerId,
      mimeType: 'model/3mf',
      objectKey: 'private/request-2/source.3mf',
      originalFilename: 'source.3mf',
      purpose: 'SERVICE_REQUEST_SOURCE',
      sizeBytes: 4096,
      storageProvider: 'gcs',
    })

    await expect(
      harness.fileAccess.requestDownloadAccess({
        actorUserId: unrelatedId,
        assetId: asset.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)

    await harness.fileAssetAccessGrants.repository.create({
      assetId: asset.id,
      contextId: createUserId('301'),
      contextType: 'ORDER_PARTICIPANT',
      expiresAt: parseUtcTimestamp('2026-06-28T09:59:00.000Z'),
      grantedByUserId: buyerId,
      granteeUserId: invitedId,
      id: createUserId('214'),
    })

    await expect(
      harness.fileAccess.requestDownloadAccess({
        actorUserId: invitedId,
        assetId: asset.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)

    const activeGrant = await harness.fileAssetAccessGrants.repository.create({
      assetId: asset.id,
      contextId: createUserId('302'),
      contextType: 'ORDER_PARTICIPANT',
      expiresAt: parseUtcTimestamp('2026-06-28T12:00:00.000Z'),
      grantedByUserId: buyerId,
      granteeUserId: invitedId,
      id: createUserId('215'),
    })

    await harness.fileAccess.revokeAccessGrant({
      actorUserId: buyerId,
      expectedVersion: activeGrant.version,
      grantId: activeGrant.id,
      reason: 'participant removed',
    })

    await expect(
      harness.fileAccess.requestDownloadAccess({
        actorUserId: invitedId,
        assetId: asset.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError)
  })

  it('rejects public preview assets that directly reuse a private source object key', async () => {
    const harness = createHarness([createUserId('221'), createUserId('222')])
    const buyerId = createUserId('021')

    await createActiveUser(harness, buyerId)

    const sourceAsset = await harness.fileAccess.registerAsset({
      actorUserId: buyerId,
      mimeType: 'model/stl',
      objectKey: 'private/source/model.stl',
      originalFilename: 'model.stl',
      purpose: 'SERVICE_REQUEST_SOURCE',
      sizeBytes: 1024,
      storageProvider: 'gcs',
    })

    await expect(
      harness.fileAccess.registerAsset({
        actorUserId: buyerId,
        mimeType: 'image/png',
        objectKey: 'private/source/model.stl',
        originalFilename: 'preview.png',
        purpose: 'PUBLIC_PREVIEW',
        sizeBytes: 256,
        sourceAssetId: sourceAsset.id,
        storageProvider: 'gcs',
        visibility: 'PUBLIC_PREVIEW',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      fields: ['sourceAssetId', 'objectKey'],
    })
  })

  it('revokes invite grants automatically when a service request is closed', async () => {
    const harness = createHarness([
      createUserId('231'),
      createUserId('232'),
      createUserId('233'),
    ])
    const buyerId = createUserId('031')
    const providerId = createUserId('032')

    await createActiveUser(harness, buyerId)
    await createActiveUser(harness, providerId)
    await createBuyerRole(harness, buyerId, createUserId('131'))

    const asset = await harness.fileAccess.registerAsset({
      actorUserId: buyerId,
      mimeType: 'model/stl',
      objectKey: 'private/request-3/source.stl',
      originalFilename: 'source.stl',
      purpose: 'SERVICE_REQUEST_SOURCE',
      sizeBytes: 100,
      storageProvider: 'gcs',
    })

    const draft = await harness.serviceRequestsService.createDraft({
      actorUserId: buyerId,
      attachments: [
        {
          assetId: asset.id,
          mimeType: asset.mimeType,
          originalFilename: asset.originalFilename,
          sizeBytes: asset.sizeBytes,
        },
      ],
      budgetCurrency: 'THB',
      budgetMinor: 12000,
      description: 'Need an invited specialist',
      dueAt: parseUtcTimestamp('2026-07-06T10:00:00.000Z'),
      prohibitedWorkAcknowledged: true,
      serviceRegion: 'Khon Kaen',
      serviceType: 'DESIGN_ONLY',
      title: 'Invite-only source review',
      visibility: 'INVITE_ONLY',
    })
    const published = await harness.serviceRequestsService.publishRequest({
      actorUserId: buyerId,
      expectedVersion: draft.version,
      requestId: draft.id,
    })

    const grant = await harness.fileAccess.createAccessGrant({
      actorUserId: buyerId,
      assetId: asset.id,
      contextId: published.id,
      contextType: 'SERVICE_REQUEST_INVITE',
      expiresAt: parseUtcTimestamp('2026-06-28T12:00:00.000Z'),
      granteeUserId: providerId,
    })

    await harness.serviceRequestsService.closeRequest({
      actorUserId: buyerId,
      expectedVersion: published.version,
      requestId: published.id,
    })

    const revokedGrant = await harness.fileAssetAccessGrants.repository.findById(grant.id)
    expect(revokedGrant).toMatchObject({
      revokedReason: 'SERVICE_REQUEST_CLOSED',
    })
  })
})
