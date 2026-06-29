import {
  AuthorizationDeniedError,
  type AuditSinkPort,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js';
import {
  RepositoryConflictError,
  parseUtcTimestamp,
  type FileAssetRecord,
  type FileAssetRepository,
  type FileAssetStatus,
  type FileAssetVisibility,
  type FileUploadSessionRecord,
  type FileUploadSessionRepository,
  type FileUploadSessionResolution,
  type FileUploadSessionStatus,
  type UtcTimestamp,
  type UserRecord,
  type UserRepository,
  type Uuidv7,
} from '@pim/domain';

export type FileUploadSessionDto = Readonly<{
  actorUserId: Uuidv7;
  assetId: Uuidv7;
  checksumSha256: string | null;
  expectedSizeBytes: number;
  expiresAt: UtcTimestamp;
  id: Uuidv7;
  kind: 'RESUMABLE' | 'DIRECT';
  maxChunkBytes: number | null;
  mimeType: string;
  objectKey: string;
  originalFilename: string;
  purpose: string;
  receivedBytes: number;
  receivedChunks: number;
  status: FileUploadSessionStatus;
  storageProvider: string;
  version: number;
  visibility: FileAssetVisibility;
}>;

export type ResumableUploadTicketDto = Readonly<{
  assetId: Uuidv7;
  chunkUrlTemplate: string;
  expiresAt: UtcTimestamp;
  maxChunkBytes: number | null;
  sessionId: Uuidv7;
  totalBytes: number;
  uploadUrl: string;
}>;

export type CreateFileUploadSessionCommand = Readonly<{
  actorUserId: Uuidv7;
  checksumSha256?: string | null;
  expectedSizeBytes: number;
  expiresInMinutes?: number;
  kind?: 'RESUMABLE' | 'DIRECT';
  maxChunkBytes?: number | null;
  mimeType: string;
  originalFilename: string;
  purpose: string;
  storageProvider?: string;
  visibility?: FileAssetVisibility;
}>;

export type AppendUploadChunkCommand = Readonly<{
  actorUserId: Uuidv7;
  bytes: number;
  expectedVersion: number;
  sessionId: Uuidv7;
}>;

export type AbortFileUploadSessionCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  reason: string;
  sessionId: Uuidv7;
}>;

export class FileUploadValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  readonly fields: readonly string[];
  readonly status = 400;

  constructor(fields: readonly string[], message: string) {
    super(message);
    this.name = 'FileUploadValidationError';
    this.fields = fields;
  }
}

export class FileUploadSessionNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(message: string) {
    super(message);
    this.name = 'FileUploadSessionNotFoundError';
  }
}

export class FileUploadSessionExpiredError extends Error {
  readonly code = 'FILE_UPLOAD_SESSION_EXPIRED';
  readonly status = 410;

  constructor(message: string) {
    super(message);
    this.name = 'FileUploadSessionExpiredError';
  }
}

export class FileUploadSessionStateError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly fields: readonly string[];
  readonly status = 409;

  constructor(message: string, fields: readonly string[] = ['status']) {
    super(message);
    this.name = 'FileUploadSessionStateError';
    this.fields = fields;
  }
}

export class FileTypeUnsupportedError extends Error {
  readonly code = 'FILE_TYPE_UNSUPPORTED';
  readonly fields: readonly string[];
  readonly status = 415;

  constructor(message: string, fields: readonly string[] = ['mimeType']) {
    super(message);
    this.name = 'FileTypeUnsupportedError';
    this.fields = fields;
  }
}

export class FileSizeExceededError extends Error {
  readonly code = 'FILE_SIZE_EXCEEDED';
  readonly fields: readonly string[];
  readonly status = 413;

  constructor(
    message: string,
    fields: readonly string[] = ['expectedSizeBytes'],
  ) {
    super(message);
    this.name = 'FileSizeExceededError';
    this.fields = fields;
  }
}

const ALLOWED_MIME_PREFIXES: ReadonlySet<string> = new Set([
  'model/',
  'image/',
  'application/pdf',
  'application/octet-stream',
  'application/zip',
]);

// Allowlist of storage providers. The default is `STANDARD` (Firestore Storage /
// Cloud Storage compatible) which matches the in-environment test path.
const STORAGE_PROVIDER_ALLOWLIST: ReadonlySet<string> = new Set([
  'STANDARD',
  'GCS',
  'S3',
]);

const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB
const DEFAULT_MAX_CHUNK_BYTES = 16 * 1024 * 1024; // 16 MiB
const DEFAULT_EXPIRY_MINUTES = 60;

const VISIBILITY_VALUES: ReadonlySet<FileAssetVisibility> =
  new Set<FileAssetVisibility>([
    'PRIVATE',
    'ORDER_PARTICIPANTS',
    'ORGANIZATION',
    'PUBLIC_PREVIEW',
  ]);

const RESERVED_OBJECT_KEY_PREFIXES: readonly string[] = [
  'public-content/',
  'system/',
  'admin/',
  '../',
  '..\\',
];
void RESERVED_OBJECT_KEY_PREFIXES; // Reserved for client-supplied object key
// validation (server still issues the actual key, but a future iteration
// could let advanced clients pass a `keyHint` for organization).

export type FileUploadSessionServicePorts = Readonly<{
  auditSink?: AuditSinkPort;
  clock: ClockPort;
  fileAssets: FileAssetRepository;
  fileUploadSessions: FileUploadSessionRepository;
  uploadTicketSigner: Readonly<{
    createResumableUploadTicket(
      input: Readonly<{
        actorUserId: Uuidv7;
        assetId: Uuidv7;
        expiresAt: UtcTimestamp;
        maxChunkBytes: number | null;
        objectKey: string;
        sessionId: Uuidv7;
        storageProvider: string;
      }>,
    ): Promise<ResumableUploadTicketDto> | ResumableUploadTicketDto;
  }>;
  users: UserRepository;
  uuidGenerator: UuidGeneratorPort;
}>;

export type FileUploadSessionService = Readonly<{
  abortSession(
    command: AbortFileUploadSessionCommand,
  ): Promise<FileUploadSessionDto>;
  appendChunk(command: AppendUploadChunkCommand): Promise<FileUploadSessionDto>;
  createSession(
    command: CreateFileUploadSessionCommand,
  ): Promise<FileUploadSessionDto>;
  getSession(
    input: Readonly<{ actorUserId: Uuidv7; sessionId: Uuidv7 }>,
  ): Promise<{
    session: FileUploadSessionDto;
    ticket: ResumableUploadTicketDto;
  }>;
}>;

const noopAuditSink: AuditSinkPort = Object.freeze({
  record() {
    return undefined;
  },
});

function createValidationError(
  fields: readonly string[],
  message: string,
): FileUploadValidationError {
  return new FileUploadValidationError(fields, message);
}

function normalizeRequiredText(value: string, field: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    throw createValidationError([field], `${field} is required`);
  }
  return normalized;
}

function normalizeNullableChecksum(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw createValidationError(
      ['checksumSha256'],
      'checksumSha256 must be a 64-character hex string',
    );
  }
  return normalized;
}

function normalizeMimeType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw createValidationError(['mimeType'], 'mimeType is required');
  }
  if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+(?:\s*;\s*.+)?$/.test(normalized)) {
    throw createValidationError(
      ['mimeType'],
      'mimeType is not a well-formed media type',
    );
  }
  const baseType = normalized.split(';', 1)[0]?.trim() ?? normalized;
  const allowed = [...ALLOWED_MIME_PREFIXES].some((prefix) => {
    if (prefix.endsWith('/')) {
      return baseType.startsWith(prefix);
    }
    return baseType === prefix;
  });
  if (!allowed) {
    throw new FileTypeUnsupportedError(
      `mimeType ${baseType} is not allowed; expected model/*, image/*, application/pdf, application/zip or application/octet-stream`,
    );
  }
  return baseType;
}

function normalizePurpose(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    throw createValidationError(['purpose'], 'purpose is required');
  }
  if (normalized.length > 64) {
    throw createValidationError(
      ['purpose'],
      'purpose must not exceed 64 characters',
    );
  }
  if (!/^[A-Z0-9_]+$/.test(normalized)) {
    throw createValidationError(
      ['purpose'],
      'purpose must only contain uppercase letters, digits and underscores',
    );
  }
  return normalized;
}

function normalizeVisibility(
  value: FileAssetVisibility | undefined,
): FileAssetVisibility {
  if (!value) {
    return 'PRIVATE';
  }
  if (!VISIBILITY_VALUES.has(value)) {
    throw createValidationError(
      ['visibility'],
      `visibility ${value} is not supported`,
    );
  }
  return value;
}

function normalizeStorageProvider(value: string | undefined): string {
  const normalized = (value ?? 'STANDARD').trim();
  if (!STORAGE_PROVIDER_ALLOWLIST.has(normalized)) {
    throw createValidationError(
      ['storageProvider'],
      `storageProvider ${normalized} is not in the allowlist`,
    );
  }
  return normalized;
}

function normalizePositiveInteger(
  value: number,
  field: string,
  max: number,
): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw createValidationError([field], `${field} must be a positive integer`);
  }
  if (value > max) {
    throw new FileSizeExceededError(`${field} must not exceed ${max} bytes`, [
      field,
    ]);
  }
  return value;
}

function normalizeOptionalPositiveInteger(
  value: number | null | undefined,
  field: string,
  max: number,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return normalizePositiveInteger(value, field, max);
}
void normalizeOptionalPositiveInteger; // Reserved for callers that need to
// accept `null` for "no chunking". The session service currently resolves a
// concrete default, but we keep this helper for parity with the file-access
// normalization suite.

function ensureActiveUser(
  users: UserRepository,
  userId: Uuidv7,
): Promise<UserRecord> {
  return users.findById(userId).then((user) => {
    if (!user) {
      throw new FileUploadSessionNotFoundError(`User ${userId} was not found`);
    }
    if (user.status !== 'ACTIVE') {
      throw new AuthorizationDeniedError('บัญชีผู้ใช้นี้ไม่สามารถใช้งานได้');
    }
    return user;
  });
}

async function loadSessionOrThrow(
  repo: FileUploadSessionRepository,
  id: Uuidv7,
): Promise<FileUploadSessionRecord> {
  const session = await repo.findById(id);
  if (!session) {
    throw new FileUploadSessionNotFoundError(
      `Upload session ${id} was not found`,
    );
  }
  return session;
}

function ensureNotExpired(
  session: FileUploadSessionRecord,
  now: UtcTimestamp,
): void {
  if (Date.parse(session.expiresAt) <= Date.parse(now)) {
    throw new FileUploadSessionExpiredError('upload session has expired');
  }
}

function ensureActorOwnsSession(
  session: FileUploadSessionRecord,
  actorUserId: Uuidv7,
): void {
  if (session.actorUserId !== actorUserId) {
    throw new AuthorizationDeniedError('คุณไม่มีสิทธิ์จัดการเซสชันอัปโหลดนี้');
  }
}

function buildObjectKey(
  storageProvider: string,
  assetId: Uuidv7,
  originalFilename: string,
): string {
  const safeName =
    originalFilename
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'file';
  // The object key is always generated by the server; the client never
  // supplies it. Storage provider and assetId combine to make the path
  // unique, stable, and bound to the asset record created later.
  return `private/${storageProvider.toLowerCase()}/${assetId}/${safeName}`;
}

function toFileUploadSessionDto(
  record: FileUploadSessionRecord,
): FileUploadSessionDto {
  return Object.freeze({
    actorUserId: record.actorUserId,
    assetId: record.assetId,
    checksumSha256: record.checksumSha256,
    expectedSizeBytes: record.expectedSizeBytes,
    expiresAt: record.expiresAt,
    id: record.id,
    kind: record.kind,
    maxChunkBytes: record.maxChunkBytes,
    mimeType: record.mimeType,
    objectKey: record.objectKey,
    originalFilename: record.originalFilename,
    purpose: record.purpose,
    receivedBytes: record.receivedBytes,
    receivedChunks: record.receivedChunks,
    status: record.status,
    storageProvider: record.storageProvider,
    version: record.version,
    visibility: record.visibility,
  });
}

async function recordAudit(
  auditSink: AuditSinkPort | undefined,
  input: Readonly<{
    details: Readonly<Record<string, string | number | boolean | null>>;
    occurredAt: UtcTimestamp;
    session: FileUploadSessionRecord;
    type: string;
    userId: Uuidv7;
  }>,
): Promise<void> {
  await (auditSink ?? noopAuditSink).record({
    details: Object.freeze({
      assetId: input.session.assetId,
      mimeType: input.session.mimeType,
      objectKey: input.session.objectKey,
      sessionId: input.session.id,
      status: input.session.status,
      ...input.details,
    }),
    occurredAt: input.occurredAt,
    type: input.type,
    userId: input.userId,
  });
}

function defaultAssetStatusForUpload(): FileAssetStatus {
  // PENDING_UPLOAD is the initial state of an asset while bytes are being
  // received. The completion endpoint (Task 43) will transition to UPLOADED
  // and then QUARANTINED for scanning.
  return 'PENDING_UPLOAD';
}

export function createFileUploadSessionService(
  input: FileUploadSessionServicePorts,
): FileUploadSessionService {
  return Object.freeze({
    async createSession(command): Promise<FileUploadSessionDto> {
      const actor = await ensureActiveUser(input.users, command.actorUserId);

      const mimeType = normalizeMimeType(command.mimeType);
      const originalFilename = normalizeRequiredText(
        command.originalFilename,
        'originalFilename',
      );
      const purpose = normalizePurpose(command.purpose);
      const visibility = normalizeVisibility(command.visibility);
      const storageProvider = normalizeStorageProvider(command.storageProvider);
      const checksumSha256 = normalizeNullableChecksum(command.checksumSha256);
      const expectedSizeBytes = normalizePositiveInteger(
        command.expectedSizeBytes,
        'expectedSizeBytes',
        DEFAULT_MAX_FILE_BYTES,
      );
      const kind: 'RESUMABLE' | 'DIRECT' = command.kind ?? 'RESUMABLE';
      const maxChunkBytes =
        command.maxChunkBytes === null || command.maxChunkBytes === undefined
          ? kind === 'DIRECT'
            ? null
            : DEFAULT_MAX_CHUNK_BYTES
          : normalizePositiveInteger(
              command.maxChunkBytes,
              'maxChunkBytes',
              DEFAULT_MAX_CHUNK_BYTES,
            );

      // Pre-create the file asset in PENDING_UPLOAD. The asset is the durable
      // record that will be referenced by later completion, scan, and access
      // operations. The session binds the asset to the in-progress upload.
      const assetId = input.uuidGenerator.next();
      const objectKey = buildObjectKey(
        storageProvider,
        assetId,
        originalFilename,
      );

      const expiresAt = addMinutes(
        input.clock.now(),
        command.expiresInMinutes ?? DEFAULT_EXPIRY_MINUTES,
      );

      const sessionId = input.uuidGenerator.next();
      const now = input.clock.now();

      // Create the asset first so we can guarantee the asset exists when the
      // session is opened. The asset remains private with status PENDING_UPLOAD
      // and cannot be downloaded until scan completes.
      const asset = await input.fileAssets.create({
        checksumSha256,
        createdBy: actor.id,
        id: assetId,
        mimeType,
        objectKey,
        organizationId: null,
        originalFilename,
        ownerUserId: actor.id,
        purpose,
        sizeBytes: expectedSizeBytes,
        sourceAssetId: null,
        status: defaultAssetStatusForUpload(),
        storageProvider,
        updatedBy: actor.id,
        visibility,
      });
      void asset; // Asset is intentionally not returned to the caller yet; the
      // session encapsulates the upload relationship.

      const session = await input.fileUploadSessions.create({
        actorUserId: actor.id,
        assetId,
        checksumSha256,
        expectedSizeBytes,
        expiresAt: parseUtcTimestamp(expiresAt),
        id: sessionId,
        kind,
        maxChunkBytes,
        mimeType,
        objectKey,
        organizationId: null,
        originalFilename,
        purpose,
        storageProvider,
        visibility,
      });

      await recordAudit(input.auditSink, {
        details: Object.freeze({
          action: 'OPENED',
          chunkLimitBytes: maxChunkBytes,
          expectedSizeBytes,
          kind,
        }),
        occurredAt: now,
        session,
        type: 'file.upload_session.opened',
        userId: actor.id,
      });

      return toFileUploadSessionDto(session);
    },

    async getSession({ actorUserId, sessionId }): Promise<{
      session: FileUploadSessionDto;
      ticket: ResumableUploadTicketDto;
    }> {
      const session = await loadSessionOrThrow(
        input.fileUploadSessions,
        sessionId,
      );
      ensureActorOwnsSession(session, actorUserId);
      const now = input.clock.now();
      if (session.status === 'OPEN' || session.status === 'IN_PROGRESS') {
        ensureNotExpired(session, now);
      }
      const ticket = await input.uploadTicketSigner.createResumableUploadTicket(
        {
          actorUserId,
          assetId: session.assetId,
          expiresAt: session.expiresAt,
          maxChunkBytes: session.maxChunkBytes,
          objectKey: session.objectKey,
          sessionId: session.id,
          storageProvider: session.storageProvider,
        },
      );
      return { session: toFileUploadSessionDto(session), ticket };
    },

    async appendChunk(command): Promise<FileUploadSessionDto> {
      const session = await loadSessionOrThrow(
        input.fileUploadSessions,
        command.sessionId,
      );
      ensureActorOwnsSession(session, command.actorUserId);
      const now = input.clock.now();
      ensureNotExpired(session, now);
      if (session.status !== 'OPEN' && session.status !== 'IN_PROGRESS') {
        throw new FileUploadSessionStateError(
          `cannot append chunk to a ${session.status} session`,
        );
      }
      const bytes = normalizePositiveInteger(
        command.bytes,
        'bytes',
        DEFAULT_MAX_CHUNK_BYTES,
      );
      if (session.maxChunkBytes !== null && bytes > session.maxChunkBytes) {
        throw new FileSizeExceededError(
          `chunk size ${bytes} exceeds session maxChunkBytes ${session.maxChunkBytes}`,
        );
      }
      const receivedBytes = session.receivedBytes + bytes;
      if (receivedBytes > session.expectedSizeBytes) {
        throw new FileSizeExceededError(
          `appending chunk would exceed expected total ${session.expectedSizeBytes}`,
        );
      }
      const nextStatus: FileUploadSessionStatus = 'IN_PROGRESS';
      const next = await input.fileUploadSessions.update(
        Object.freeze({
          ...session,
          receivedBytes,
          receivedChunks: session.receivedChunks + 1,
          status: nextStatus,
          updatedBy: command.actorUserId,
        }),
        command.expectedVersion,
      );
      await recordAudit(input.auditSink, {
        details: Object.freeze({
          action: 'CHUNK_APPENDED',
          bytes,
          chunkIndex: next.receivedChunks,
          receivedBytes,
        }),
        occurredAt: now,
        session: next,
        type: 'file.upload_session.chunk_appended',
        userId: command.actorUserId,
      });
      return toFileUploadSessionDto(next);
    },

    async abortSession(command): Promise<FileUploadSessionDto> {
      const session = await loadSessionOrThrow(
        input.fileUploadSessions,
        command.sessionId,
      );
      ensureActorOwnsSession(session, command.actorUserId);
      if (session.status === 'COMPLETED' || session.status === 'ABORTED') {
        throw new FileUploadSessionStateError(
          `cannot abort a ${session.status} session`,
        );
      }
      const reason = normalizeRequiredText(command.reason, 'reason');
      const now = input.clock.now();
      const resolution: FileUploadSessionResolution = 'SESSION_ABORTED';
      const next = await input.fileUploadSessions.update(
        Object.freeze({
          ...session,
          status: 'ABORTED',
          updatedBy: command.actorUserId,
        }),
        command.expectedVersion,
      );
      await recordAudit(input.auditSink, {
        details: Object.freeze({ action: 'ABORTED', reason, resolution }),
        occurredAt: now,
        session: next,
        type: 'file.upload_session.aborted',
        userId: command.actorUserId,
      });
      return toFileUploadSessionDto(next);
    },
  });
}

function addMinutes(nowIso: UtcTimestamp, minutes: number): UtcTimestamp {
  const base = new Date(Date.parse(nowIso));
  base.setUTCMinutes(base.getUTCMinutes() + minutes);
  return parseUtcTimestamp(base);
}

export function assertFileUploadSessionVersionConflict(
  error: unknown,
): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError;
}

// Re-export commonly used types from the FileAssetRecord so callers can
// compose with the existing file-access service without circular imports.
export type { FileAssetRecord, FileAssetVisibility };
