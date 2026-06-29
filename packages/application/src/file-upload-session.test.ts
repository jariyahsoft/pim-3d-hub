import { describe, expect, it } from 'vitest';
import { AuthorizationDeniedError, type AuditEvent } from './identity.js';
import {
  FileSizeExceededError,
  FileTypeUnsupportedError,
  FileUploadSessionExpiredError,
  FileUploadSessionNotFoundError,
  FileUploadSessionStateError,
  FileUploadValidationError,
  createFileUploadSessionService,
} from './file-upload-session.js';
import { parseUuidv7 } from '@pim/domain';
import { createInMemoryUserRepository } from '../../infrastructure/src/index.js';
import {
  createFakeClock,
  createFakeUuidGenerator,
  createInMemoryFileAssetRepository,
  createInMemoryFileUploadSessionRepository,
} from '../../testkit/src/index.js';

function createUserId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`);
}

type FileUploadHarness = ReturnType<typeof createHarness>;

function createHarness(uuidIds: readonly string[] = []) {
  const clock = createFakeClock('2026-06-28T23:00:00.000Z');
  const users = createInMemoryUserRepository({ clock });
  const fileAssets = createInMemoryFileAssetRepository({ clock });
  const fileUploadSessions = createInMemoryFileUploadSessionRepository({
    clock,
  });
  const auditEvents: AuditEvent[] = [];
  const tickets: { sessionId: string; url: string; maxChunk: number | null }[] =
    [];
  const uuidGenerator = createFakeUuidGenerator(uuidIds);

  const service = createFileUploadSessionService({
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
        const url = `https://uploads.example/${input.sessionId}`;
        tickets.push({
          sessionId: input.sessionId,
          url,
          maxChunk: input.maxChunkBytes,
        });
        return {
          assetId: input.assetId,
          chunkUrlTemplate: `${url}/chunks/{chunkIndex}`,
          expiresAt: input.expiresAt,
          maxChunkBytes: input.maxChunkBytes,
          sessionId: input.sessionId,
          totalBytes: 0,
          uploadUrl: url,
        };
      },
    },
    users,
    uuidGenerator,
  });

  return {
    auditEvents,
    clock,
    fileAssets,
    fileUploadSessions,
    service,
    tickets,
    users,
  };
}

async function createActiveUser(
  harness: FileUploadHarness,
  userId: ReturnType<typeof parseUuidv7>,
) {
  await harness.users.create({ id: userId });
}

describe('file upload session service', () => {
  it('creates a session that is bound to a server-issued object key', async () => {
    const harness = createHarness([
      createUserId('201'), // assetId
      createUserId('301'), // sessionId
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      checksumSha256: 'a'.repeat(64),
      expectedSizeBytes: 1024,
      mimeType: 'model/stl',
      originalFilename: 'bracket.stl',
      purpose: 'MODEL_3D',
    });

    expect(session.actorUserId).toBe(buyer);
    expect(session.status).toBe('OPEN');
    expect(session.objectKey.startsWith('private/standard/')).toBe(true);
    expect(session.objectKey.endsWith('bracket.stl')).toBe(true);
    expect(session.receivedBytes).toBe(0);
    expect(session.receivedChunks).toBe(0);
    expect(session.maxChunkBytes).not.toBeNull();

    // A matching file asset is created in PENDING_UPLOAD.
    const asset = await harness.fileAssets.repository.findById(session.assetId);
    expect(asset).not.toBeNull();
    expect(asset?.status).toBe('PENDING_UPLOAD');
    expect(asset?.ownerUserId).toBe(buyer);
    expect(asset?.visibility).toBe('PRIVATE');

    // Audit event was emitted for the open.
    expect(harness.auditEvents.length).toBe(1);
    expect(harness.auditEvents[0]?.type).toBe('file.upload_session.opened');
  });

  it('rejects unsupported mime types with FILE_TYPE_UNSUPPORTED', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    await expect(
      harness.service.createSession({
        actorUserId: buyer,
        expectedSizeBytes: 1024,
        mimeType: 'application/x-msdownload',
        originalFilename: 'malware.exe',
        purpose: 'MODEL_3D',
      }),
    ).rejects.toBeInstanceOf(FileTypeUnsupportedError);
  });

  it('rejects files exceeding the maximum allowed size', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    await expect(
      harness.service.createSession({
        actorUserId: buyer,
        expectedSizeBytes: 6 * 1024 * 1024 * 1024, // 6 GiB > 5 GiB cap
        mimeType: 'model/stl',
        originalFilename: 'huge.stl',
        purpose: 'MODEL_3D',
      }),
    ).rejects.toBeInstanceOf(FileSizeExceededError);
  });

  it('rejects empty filenames with a validation error', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    await expect(
      harness.service.createSession({
        actorUserId: buyer,
        expectedSizeBytes: 1024,
        mimeType: 'model/stl',
        originalFilename: '   ',
        purpose: 'MODEL_3D',
      }),
    ).rejects.toBeInstanceOf(FileUploadValidationError);
  });

  it('accumulates chunk bytes until the expected size is met', async () => {
    const harness = createHarness([
      createUserId('201'), // assetId
      createUserId('301'), // sessionId
    ]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 4096,
      maxChunkBytes: 2048,
      mimeType: 'model/stl',
      originalFilename: 'part.stl',
      purpose: 'MODEL_3D',
    });

    const afterFirstChunk = await harness.service.appendChunk({
      actorUserId: buyer,
      bytes: 1024,
      expectedVersion: session.version,
      sessionId: session.id,
    });
    expect(afterFirstChunk.receivedBytes).toBe(1024);
    expect(afterFirstChunk.receivedChunks).toBe(1);
    expect(afterFirstChunk.status).toBe('IN_PROGRESS');

    const afterSecondChunk = await harness.service.appendChunk({
      actorUserId: buyer,
      bytes: 2048,
      expectedVersion: afterFirstChunk.version,
      sessionId: session.id,
    });
    expect(afterSecondChunk.receivedBytes).toBe(3072);
    expect(afterSecondChunk.receivedChunks).toBe(2);
  });

  it('rejects a chunk that exceeds the session max chunk size', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 8192,
      maxChunkBytes: 2048,
      mimeType: 'model/stl',
      originalFilename: 'piece.stl',
      purpose: 'MODEL_3D',
    });

    await expect(
      harness.service.appendChunk({
        actorUserId: buyer,
        bytes: 4096,
        expectedVersion: session.version,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileSizeExceededError);
  });

  it('rejects a chunk that would exceed the expected total size', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      maxChunkBytes: 1024,
      mimeType: 'model/stl',
      originalFilename: 'tiny.stl',
      purpose: 'MODEL_3D',
    });

    await harness.service.appendChunk({
      actorUserId: buyer,
      bytes: 1024,
      expectedVersion: session.version,
      sessionId: session.id,
    });

    // Even if the next attempt passes a different version, the state still
    // tracks that we are at the expected size; the service must reject any
    // further bytes regardless of version because the new state cannot
    // exceed the bound.
    await expect(
      harness.service.appendChunk({
        actorUserId: buyer,
        bytes: 256,
        expectedVersion: 2,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileSizeExceededError);
  });

  it('denies chunk appending to a session owned by another user', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    const otherUser = createUserId('002');
    await createActiveUser(harness, buyer);
    await createActiveUser(harness, otherUser);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      mimeType: 'model/stl',
      originalFilename: 'private.stl',
      purpose: 'MODEL_3D',
    });

    await expect(
      harness.service.appendChunk({
        actorUserId: otherUser,
        bytes: 256,
        expectedVersion: session.version,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });

  it('rejects expired sessions when getSession is called', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      expiresInMinutes: 30,
      mimeType: 'model/stl',
      originalFilename: 'session.stl',
      purpose: 'MODEL_3D',
    });

    harness.clock.advanceMinutes(45);

    await expect(
      harness.service.getSession({ actorUserId: buyer, sessionId: session.id }),
    ).rejects.toBeInstanceOf(FileUploadSessionExpiredError);
  });

  it('returns a resumable ticket from getSession with the correct object key', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      mimeType: 'model/stl',
      originalFilename: 'ticket.stl',
      purpose: 'MODEL_3D',
    });

    const { ticket } = await harness.service.getSession({
      actorUserId: buyer,
      sessionId: session.id,
    });

    expect(ticket.sessionId).toBe(session.id);
    expect(ticket.assetId).toBe(session.assetId);
    expect(ticket.uploadUrl).toContain(session.id);
    expect(ticket.maxChunkBytes).toBe(session.maxChunkBytes);
    expect(ticket.chunkUrlTemplate).toContain('{chunkIndex}');
  });

  it('denies getSession to a user that is not the session owner', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    const attacker = createUserId('002');
    await createActiveUser(harness, buyer);
    await createActiveUser(harness, attacker);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      mimeType: 'model/stl',
      originalFilename: 'mine.stl',
      purpose: 'MODEL_3D',
    });

    await expect(
      harness.service.getSession({
        actorUserId: attacker,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });

  it('returns RESOURCE_NOT_FOUND for unknown sessions', async () => {
    const harness = createHarness([]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    await expect(
      harness.service.getSession({
        actorUserId: buyer,
        sessionId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000099'),
      }),
    ).rejects.toBeInstanceOf(FileUploadSessionNotFoundError);
  });

  it('aborts an in-progress session and records an audit event', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      mimeType: 'model/stl',
      originalFilename: 'abort.stl',
      purpose: 'MODEL_3D',
    });

    const aborted = await harness.service.abortSession({
      actorUserId: buyer,
      expectedVersion: session.version,
      reason: 'user cancelled',
      sessionId: session.id,
    });
    expect(aborted.status).toBe('ABORTED');

    // No more chunks after abort.
    await expect(
      harness.service.appendChunk({
        actorUserId: buyer,
        bytes: 256,
        expectedVersion: aborted.version,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileUploadSessionStateError);

    const abortEvent = harness.auditEvents.find(
      (event) => event.type === 'file.upload_session.aborted',
    );
    expect(abortEvent).toBeDefined();
  });

  it('rejects empty abort reasons with a validation error', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      mimeType: 'model/stl',
      originalFilename: 'no-reason.stl',
      purpose: 'MODEL_3D',
    });

    await expect(
      harness.service.abortSession({
        actorUserId: buyer,
        expectedVersion: session.version,
        reason: '   ',
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileUploadValidationError);
  });

  it('rejects checksum with bad hex length', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    await expect(
      harness.service.createSession({
        actorUserId: buyer,
        checksumSha256: 'abcdef',
        expectedSizeBytes: 1024,
        mimeType: 'model/stl',
        originalFilename: 'bad.stl',
        purpose: 'MODEL_3D',
      }),
    ).rejects.toBeInstanceOf(FileUploadValidationError);
  });

  it('rejects appending after the session is aborted', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      mimeType: 'model/stl',
      originalFilename: 'after-abort.stl',
      purpose: 'MODEL_3D',
    });
    const aborted = await harness.service.abortSession({
      actorUserId: buyer,
      expectedVersion: session.version,
      reason: 'wrong file',
      sessionId: session.id,
    });

    await expect(
      harness.service.appendChunk({
        actorUserId: buyer,
        bytes: 256,
        expectedVersion: aborted.version,
        sessionId: session.id,
      }),
    ).rejects.toBeInstanceOf(FileUploadSessionStateError);
  });

  it('allows extending session expiry in subsequent getSession calls', async () => {
    const harness = createHarness([createUserId('201'), createUserId('301')]);
    const buyer = createUserId('001');
    await createActiveUser(harness, buyer);

    const session = await harness.service.createSession({
      actorUserId: buyer,
      expectedSizeBytes: 1024,
      expiresInMinutes: 60,
      mimeType: 'model/stl',
      originalFilename: 'long.stl',
      purpose: 'MODEL_3D',
    });

    // Advance 30 minutes, still within window.
    harness.clock.advanceMinutes(30);
    const { ticket } = await harness.service.getSession({
      actorUserId: buyer,
      sessionId: session.id,
    });
    expect(Date.parse(ticket.expiresAt)).toBeGreaterThan(
      Date.parse(harness.clock.now()),
    );
  });
});
