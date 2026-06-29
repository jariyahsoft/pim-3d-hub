import { describe, expect, it } from 'vitest';
import { AuthorizationDeniedError, type AuditEvent } from './identity.js';
import {
  FileScanRejectedError,
  FileUploadChecksumMismatchError,
  FileUploadCompletionStateError,
  FileUploadCompletionValidationError,
  FileUploadObjectSizeMismatchError,
  FileUploadSessionNotFoundError,
  createFileCompletionService,
  isGrantActive,
} from './file-upload-completion.js';
import { createFileUploadSessionService } from './file-upload-session.js';
import {
  parseUuidv7,
  type FileScanVerdict,
  type UtcTimestamp,
} from '@pim/domain';
import { createInMemoryUserRepository } from '../../infrastructure/src/index.js';
import {
  createFakeClock,
  createFakeUuidGenerator,
  createInMemoryFileAssetAccessGrantRepository,
  createInMemoryFileAssetRepository,
  createInMemoryFileRetentionHoldRepository,
  createInMemoryFileScanResultRepository,
  createInMemoryFileUploadSessionRepository,
} from '../../testkit/src/index.js';

function createUserId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`);
}

type Harness = ReturnType<typeof createHarness>;

function createHarness(uuidIds: readonly string[] = []) {
  const clock = createFakeClock('2026-06-28T23:00:00.000Z');
  const users = createInMemoryUserRepository({ clock });
  const fileAssets = createInMemoryFileAssetRepository({ clock });
  const fileAssetAccessGrants = createInMemoryFileAssetAccessGrantRepository({
    clock,
  });
  const fileUploadSessions = createInMemoryFileUploadSessionRepository({
    clock,
  });
  const fileScanResults = createInMemoryFileScanResultRepository({ clock });
  const fileRetentionHolds = createInMemoryFileRetentionHoldRepository({
    clock,
  });
  const auditEvents: AuditEvent[] = [];
  const objectStore = new Map<string, { sizeBytes: number }>();
  const scanDecisions: {
    assetId: string;
    verdict: FileScanVerdict;
    delayMs: number | null;
  }[] = [];
  const uuidGenerator = createFakeUuidGenerator(uuidIds);

  const sessionService = createFileUploadSessionService({
    auditSink: {
      record(event) {
        auditEvents.push(event);
      },
    },
    clock,
    fileAssets: fileAssets.repository,
    fileUploadSessions: fileUploadSessions.repository,
    uploadTicketSigner: {
      async createResumableUploadTicket(input) {
        return {
          assetId: input.assetId,
          chunkUrlTemplate: `https://uploads.example/${input.sessionId}/chunks/{chunkIndex}`,
          expiresAt: input.expiresAt,
          maxChunkBytes: input.maxChunkBytes,
          sessionId: input.sessionId,
          totalBytes: 0,
          uploadUrl: `https://uploads.example/${input.sessionId}`,
        };
      },
    },
    users,
    uuidGenerator,
  });

  const completionService = createFileCompletionService({
    auditSink: {
      record(event) {
        auditEvents.push(event);
      },
    },
    clock,
    fileAssetAccessGrants: fileAssetAccessGrants.repository,
    fileAssets: fileAssets.repository,
    fileRetentionHolds: fileRetentionHolds.repository,
    fileScanResults: fileScanResults.repository,
    fileUploadSessions: fileUploadSessions.repository,
    objectStorage: {
      async readObjectMetadata(input) {
        const key = `${input.storageProvider}:${input.objectKey}`;
        const record = objectStore.get(key);
        if (!record) {
          throw new FileUploadCompletionStateError(`object ${key} not found`);
        }
        return { sizeBytes: record.sizeBytes };
      },
    },
    retentionPolicy: {
      defaultRetentionDays: 30,
      purposeRules: [
        { maxRetentionDays: 365, minRetentionDays: 0, purpose: 'MODEL_3D' },
        {
          maxRetentionDays: 7,
          minRetentionDays: 0,
          purpose: 'QUARANTINED_FILE',
        },
      ],
    },
    scanner: {
      async scan(input) {
        const decision = scanDecisions.shift() ?? {
          assetId: input.assetId,
          delayMs: null,
          verdict: 'CLEAN' as FileScanVerdict,
        };
        if (decision.delayMs !== null) {
          // Simulate a slow scan to verify the sandbox does not require
          // the caller to wait synchronously.
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), decision.delayMs ?? 0);
          });
        }
        return {
          engineVersion: '1.0.0',
          findings:
            decision.verdict === 'CLEAN'
              ? []
              : [
                  {
                    category: 'EICAR_TEST',
                    detail: 'matches eicar test signature',
                    severity: 'HIGH' as const,
                  },
                ],
          rawArtifactPath: null,
          verdict: decision.verdict,
        };
      },
    },
    users,
    uuidGenerator,
  });

  return {
    auditEvents,
    clock,
    completionService,
    fileAssetAccessGrants,
    fileAssets,
    fileRetentionHolds,
    fileScanResults,
    fileUploadSessions,
    objectStore,
    scanDecisions,
    sessionService,
    users,
    uuidGenerator,
  };
}

async function createActiveUser(
  harness: Harness,
  userId: ReturnType<typeof parseUuidv7>,
) {
  await harness.users.create({ id: userId });
}

async function createReadySession(
  harness: Harness,
  buyer: ReturnType<typeof parseUuidv7>,
  options?: Readonly<{
    expectedSizeBytes?: number;
    mimeType?: string;
    originalFilename?: string;
    purpose?: string;
  }>,
) {
  const session = await harness.sessionService.createSession({
    actorUserId: buyer,
    checksumSha256: 'a'.repeat(64),
    expectedSizeBytes: options?.expectedSizeBytes ?? 2048,
    maxChunkBytes: 1024,
    mimeType: options?.mimeType ?? 'model/stl',
    originalFilename: options?.originalFilename ?? 'part.stl',
    purpose: options?.purpose ?? 'MODEL_3D',
  });
  // Pre-populate the object store as if the bytes are already there.
  harness.objectStore.set(`${session.storageProvider}:${session.objectKey}`, {
    sizeBytes: session.expectedSizeBytes,
  });
  return session;
}

describe('file upload completion service', () => {
  it('completes an upload, transitions the asset through quarantine, scan, and READY', async () => {
    const harness = createHarness([
      createUserId('201'), // assetId
      createUserId('301'), // sessionId
      createUserId('401'), // scan result id
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);
    harness.scanDecisions.push({
      assetId: session.assetId,
      delayMs: null,
      verdict: 'CLEAN',
    });

    const result = await harness.completionService.completeUpload({
      actorUserId: buyer,
      checksumSha256: 'a'.repeat(64),
      expectedSizeBytes: session.expectedSizeBytes,
      expectedVersion: session.version,
      mimeType: session.mimeType,
      sessionId: session.id,
    });

    expect(result.sessionId).toBe(session.id);
    expect(result.asset.status).toBe('READY');
    expect(result.asset.sizeBytes).toBe(session.expectedSizeBytes);
    expect(result.scanResult?.verdict).toBe('CLEAN');

    const completionEvent = harness.auditEvents.find(
      (event) => event.type === 'file.upload.completed',
    );
    expect(completionEvent).toBeDefined();
  });

  it('rejects upload completion when the checksum does not match the session', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);

    await expect(
      harness.completionService.completeUpload({
        actorUserId: buyer,
        checksumSha256: 'b'.repeat(64),
        expectedSizeBytes: session.expectedSizeBytes,
        expectedVersion: session.version,
        mimeType: session.mimeType,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileUploadChecksumMismatchError);
  });

  it('rejects upload completion when the storage object size does not match', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);
    // Object store reports a different size than declared.
    harness.objectStore.set(`${session.storageProvider}:${session.objectKey}`, {
      sizeBytes: session.expectedSizeBytes - 1,
    });

    await expect(
      harness.completionService.completeUpload({
        actorUserId: buyer,
        checksumSha256: 'a'.repeat(64),
        expectedSizeBytes: session.expectedSizeBytes,
        expectedVersion: session.version,
        mimeType: session.mimeType,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileUploadObjectSizeMismatchError);
  });

  it('rejects upload completion when the mime type does not match the session', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);

    await expect(
      harness.completionService.completeUpload({
        actorUserId: buyer,
        checksumSha256: 'a'.repeat(64),
        expectedSizeBytes: session.expectedSizeBytes,
        expectedVersion: session.version,
        mimeType: 'image/png',
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileUploadCompletionValidationError);
  });

  it('rejects upload completion by a user that is not the session owner', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    const attacker = createUserId('002');
    await createActiveUser(harness, buyer);
    await createActiveUser(harness, attacker);
    const session = await createReadySession(harness, buyer);

    await expect(
      harness.completionService.completeUpload({
        actorUserId: attacker,
        checksumSha256: 'a'.repeat(64),
        expectedSizeBytes: session.expectedSizeBytes,
        expectedVersion: session.version,
        mimeType: session.mimeType,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });

  it('marks the asset as REJECTED when the scanner returns MALICIOUS', async () => {
    const harness = createHarness([
      createUserId('201'),
      createUserId('301'),
      createUserId('401'),
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);
    harness.scanDecisions.push({
      assetId: session.assetId,
      delayMs: null,
      verdict: 'MALICIOUS',
    });

    await expect(
      harness.completionService.completeUpload({
        actorUserId: buyer,
        checksumSha256: 'a'.repeat(64),
        expectedSizeBytes: session.expectedSizeBytes,
        expectedVersion: session.version,
        mimeType: session.mimeType,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileScanRejectedError);

    const asset = await harness.fileAssets.repository.findById(session.assetId);
    expect(asset?.status).toBe('REJECTED');

    const scan = await harness.fileScanResults.repository.findLatestForAsset(
      session.assetId,
    );
    expect(scan?.verdict).toBe('MALICIOUS');
  });

  it('moves the asset to SCANNING and never to READY for SUSPICIOUS verdicts', async () => {
    const harness = createHarness([
      createUserId('201'),
      createUserId('301'),
      createUserId('401'),
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);
    harness.scanDecisions.push({
      assetId: session.assetId,
      delayMs: null,
      verdict: 'SUSPICIOUS',
    });

    const result = await harness.completionService.completeUpload({
      actorUserId: buyer,
      checksumSha256: 'a'.repeat(64),
      expectedSizeBytes: session.expectedSizeBytes,
      expectedVersion: session.version,
      mimeType: session.mimeType,
      sessionId: session.id,
    });
    expect(result.asset.status).toBe('SCANNING');
    expect(result.scanResult?.verdict).toBe('SUSPICIOUS');
  });

  it('rejects an attempt to complete an already completed session', async () => {
    const harness = createHarness([
      createUserId('201'),
      createUserId('301'),
      createUserId('401'),
      createUserId('402'), // scan result id
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);
    harness.scanDecisions.push({
      assetId: session.assetId,
      delayMs: null,
      verdict: 'CLEAN',
    });

    const first = await harness.completionService.completeUpload({
      actorUserId: buyer,
      checksumSha256: 'a'.repeat(64),
      expectedSizeBytes: session.expectedSizeBytes,
      expectedVersion: session.version,
      mimeType: session.mimeType,
      sessionId: session.id,
    });

    // The session is now COMPLETED. A second attempt must fail.
    await expect(
      harness.completionService.completeUpload({
        actorUserId: buyer,
        checksumSha256: 'a'.repeat(64),
        expectedSizeBytes: session.expectedSizeBytes,
        expectedVersion: first.sessionId === session.id ? 99 : 0,
        mimeType: session.mimeType,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileUploadCompletionStateError);
  });

  it('rejects an unknown session id with RESOURCE_NOT_FOUND', async () => {
    const harness = createHarness([]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    await expect(
      harness.completionService.completeUpload({
        actorUserId: buyer,
        checksumSha256: 'a'.repeat(64),
        expectedSizeBytes: 1024,
        expectedVersion: 1,
        mimeType: 'model/stl',
        sessionId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000077'),
      }),
    ).rejects.toBeInstanceOf(FileUploadSessionNotFoundError);
  });

  it('creates and releases a retention hold and emits audit events', async () => {
    const harness = createHarness([
      createUserId('201'), // assetId
      createUserId('301'), // sessionId
      createUserId('401'), // holdId
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);
    const asset = await harness.fileAssets.repository.findById(session.assetId);
    if (!asset) {
      throw new Error('asset missing');
    }

    const hold = await harness.completionService.createRetentionHold({
      actorUserId: buyer,
      assetId: asset.id,
      reason: 'DISPUTE_OPEN',
    });
    expect(hold.releasedAt).toBeNull();
    expect(hold.reason).toBe('DISPUTE_OPEN');

    const released = await harness.completionService.releaseRetentionHold({
      actorUserId: buyer,
      expectedVersion: hold.version,
      holdId: hold.id,
      reason: 'dispute resolved',
    });
    expect(released.releasedAt).not.toBeNull();
    expect(released.releaseReason).toBe('dispute resolved');

    const releaseEvent = harness.auditEvents.find(
      (event) => event.type === 'file.retention.hold_released',
    );
    expect(releaseEvent).toBeDefined();
  });

  it('retention job does not delete assets that are still within the retention window', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer, {
      purpose: 'MODEL_3D',
    });
    // Move asset to READY so it is eligible by status.
    await harness.fileAssets.repository.update(
      Object.freeze({
        ...(await harness.fileAssets.repository.findById(session.assetId))!,
        status: 'READY',
        updatedBy: buyer,
      }),
      1,
    );

    const decisions = await harness.completionService.runRetentionJob({
      actorUserId: null,
    });
    // The asset was created just now, well within the 30-day default window.
    const assetDecision = decisions.find(
      (entry) => entry.assetId === session.assetId,
    );
    expect(assetDecision).toBeUndefined();
  });

  it('retention job skips held assets and only deletes eligible ones', async () => {
    const harness = createHarness([
      createUserId('201'), // assetId
      createUserId('301'), // sessionId
      createUserId('401'), // holdId
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer, {
      purpose: 'QUARANTINED_FILE',
    });
    // Move asset to REJECTED so it falls into the 0-7 day policy bucket and
    // is eligible for deletion once the minimum retention has elapsed.
    await harness.fileAssets.repository.update(
      Object.freeze({
        ...(await harness.fileAssets.repository.findById(session.assetId))!,
        status: 'REJECTED',
        updatedBy: buyer,
      }),
      1,
    );

    // Add a hold that should prevent deletion.
    await harness.completionService.createRetentionHold({
      actorUserId: buyer,
      assetId: session.assetId,
      reason: 'LEGAL_HOLD',
    });

    harness.clock.advanceMinutes(60 * 24 * 30); // 30 days

    const decisions = await harness.completionService.runRetentionJob({
      actorUserId: null,
    });
    const assetDecision = decisions.find(
      (entry) => entry.assetId === session.assetId,
    );
    expect(assetDecision?.reason).toBe('HELD');
    expect(assetDecision?.deleted).toBe(false);

    // Release the hold and re-run; the asset should be deleted.
    const hold = (
      await harness.fileRetentionHolds.repository.list({
        filter: { assetId: session.assetId },
        limit: 10,
        sort: { direction: 'desc', field: 'createdAt' },
      })
    ).items[0];
    if (!hold) {
      throw new Error('hold missing');
    }
    await harness.completionService.releaseRetentionHold({
      actorUserId: buyer,
      expectedVersion: hold.version,
      holdId: hold.id,
      reason: 'legal cleared',
    });

    const second = await harness.completionService.runRetentionJob({
      actorUserId: null,
    });
    const afterRelease = second.find(
      (entry) => entry.assetId === session.assetId,
    );
    expect(afterRelease?.deleted).toBe(true);
    expect(afterRelease?.reason).toBe('OUTSIDE_RETENTION_WINDOW');
  });

  it('isGrantActive returns false for revoked or expired grants', async () => {
    const harness = createHarness([]);
    const now = harness.clock.now();
    const farFuture = '2099-01-01T00:00:00.000Z' as UtcTimestamp;
    const active = {
      assetId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000001'),
      contextId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000002'),
      contextType: 'ORDER_PARTICIPANT' as const,
      createdAt: now,
      createdBy: null,
      deletedAt: null,
      expiresAt: farFuture,
      grantedByUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000003'),
      granteeUserId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000004'),
      id: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000005'),
      permissionCode: 'READ' as const,
      revokedAt: null,
      revokedReason: null,
      schemaVersion: 1,
      updatedAt: now,
      updatedBy: null,
      version: 1,
    };
    expect(isGrantActive(active, now)).toBe(true);

    const revoked = { ...active, revokedAt: now };
    expect(isGrantActive(revoked, now)).toBe(false);

    const farPast = '2020-01-01T00:00:00.000Z' as UtcTimestamp;
    const expired = { ...active, expiresAt: farPast };
    expect(isGrantActive(expired, now)).toBe(false);
  });

  it('getScanResult returns the latest scan for an asset', async () => {
    const harness = createHarness([
      createUserId('201'),
      createUserId('301'),
      createUserId('401'),
      createUserId('402'),
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);
    const session = await createReadySession(harness, buyer);
    harness.scanDecisions.push({
      assetId: session.assetId,
      delayMs: null,
      verdict: 'CLEAN',
    });
    await harness.completionService.completeUpload({
      actorUserId: buyer,
      checksumSha256: 'a'.repeat(64),
      expectedSizeBytes: session.expectedSizeBytes,
      expectedVersion: session.version,
      mimeType: session.mimeType,
      sessionId: session.id,
    });

    const scan = await harness.completionService.getScanResult(session.assetId);
    expect(scan?.verdict).toBe('CLEAN');
    expect(scan?.assetId).toBe(session.assetId);
  });
});
