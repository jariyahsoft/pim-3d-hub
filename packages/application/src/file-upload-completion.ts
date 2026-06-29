import {
  AuthorizationDeniedError,
  type AuditSinkPort,
  type ClockPort,
  type UuidGeneratorPort,
} from './identity.js';
import {
  RepositoryConflictError,
  parseUtcTimestamp,
  type FileAssetAccessGrantRecord,
  type FileAssetAccessGrantRepository,
  type FileAssetRecord,
  type FileAssetRepository,
  type FileAssetStatus,
  type FileRetentionHoldRecord,
  type FileRetentionHoldRepository,
  type FileScanResultRecord,
  type FileScanResultRepository,
  type FileScanVerdict,
  type FileUploadSessionRecord,
  type FileUploadSessionRepository,
  type FileUploadSessionStatus,
  type UtcTimestamp,
  type UserRecord,
  type UserRepository,
  type Uuidv7,
} from '@pim/domain';

export type FileUploadCompletionDto = Readonly<{
  asset: Readonly<{
    id: Uuidv7;
    mimeType: string;
    objectKey: string;
    originalFilename: string;
    sizeBytes: number;
    status: FileAssetStatus;
    version: number;
    visibility: FileAssetRecord['visibility'];
  }>;
  scanResult: {
    id: Uuidv7;
    verdict: FileScanVerdict;
  } | null;
  sessionId: Uuidv7;
}>;

export type FileScanResultDto = Readonly<{
  assetId: Uuidv7;
  engineVersion: string;
  finishedAt: UtcTimestamp | null;
  findings: readonly {
    category: string;
    detail: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }[];
  id: Uuidv7;
  rawArtifactPath: string | null;
  scannerName: string;
  startedAt: UtcTimestamp;
  verdict: FileScanVerdict;
}>;

export type FileRetentionDecisionDto = Readonly<{
  assetId: Uuidv7;
  deleted: boolean;
  held: boolean;
  holdReason: string | null;
  reason:
    | 'OUTSIDE_RETENTION_WINDOW'
    | 'WITHIN_RETENTION_WINDOW'
    | 'HELD'
    | 'NOT_READY';
}>;

export type CompleteFileUploadCommand = Readonly<{
  actorUserId: Uuidv7;
  checksumSha256: string;
  expectedSizeBytes: number;
  expectedVersion: number;
  mimeType: string;
  sessionId: Uuidv7;
}>;

export type CreateFileRetentionHoldCommand = Readonly<{
  actorUserId: Uuidv7 | null;
  assetId: Uuidv7;
  expiresAt?: UtcTimestamp | null;
  reason:
    | 'ORDER_OPEN'
    | 'DISPUTE_OPEN'
    | 'LEGAL_HOLD'
    | 'TAX_RETENTION'
    | 'KYC_RETENTION';
}>;

export type ReleaseFileRetentionHoldCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  holdId: Uuidv7;
  reason: string;
}>;

export type RunRetentionJobCommand = Readonly<{
  actorUserId: Uuidv7 | null;
  evaluatedAt?: UtcTimestamp;
  limit?: number;
}>;

export type FileUploadCompletionError = Error &
  Readonly<{
    code:
      | 'VALIDATION_ERROR'
      | 'CHECKSUM_MISMATCH'
      | 'SCAN_REJECTED'
      | 'OBJECT_SIZE_MISMATCH'
      | 'SESSION_EXPIRED'
      | 'NOT_FOUND'
      | 'STATE_ERROR';
    status: 400 | 409 | 410 | 422 | 404;
  }>;

export class FileUploadSessionNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(message: string) {
    super(message);
    this.name = 'FileUploadSessionNotFoundError';
  }
}

export class FileUploadChecksumMismatchError extends Error {
  readonly code = 'CHECKSUM_MISMATCH';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'FileUploadChecksumMismatchError';
  }
}

export class FileUploadObjectSizeMismatchError extends Error {
  readonly code = 'OBJECT_SIZE_MISMATCH';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'FileUploadObjectSizeMismatchError';
  }
}

export class FileScanRejectedError extends Error {
  readonly code = 'FILE_SCAN_REJECTED';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'FileScanRejectedError';
  }
}

export class FileUploadCompletionStateError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly fields: readonly string[];
  readonly status = 409;

  constructor(message: string, fields: readonly string[] = ['status']) {
    super(message);
    this.name = 'FileUploadCompletionStateError';
    this.fields = fields;
  }
}

export class FileUploadCompletionValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  readonly fields: readonly string[];
  readonly status = 400;

  constructor(fields: readonly string[], message: string) {
    super(message);
    this.name = 'FileUploadCompletionValidationError';
    this.fields = fields;
  }
}

export type FileScanPort = Readonly<{
  scan(
    input: Readonly<{
      assetId: Uuidv7;
      mimeType: string;
      objectKey: string;
      originalFilename: string;
      sizeBytes: number;
    }>,
  ): Promise<{
    engineVersion: string;
    findings: readonly {
      category: string;
      detail: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }[];
    rawArtifactPath: string | null;
    verdict: FileScanVerdict;
  }>;
}>;

export type ObjectStorageInspector = Readonly<{
  readObjectMetadata(
    input: Readonly<{
      mimeType: string;
      objectKey: string;
      storageProvider: string;
    }>,
  ): Promise<{
    sizeBytes: number;
  }>;
}>;

export type FileCompletionServicePorts = Readonly<{
  auditSink?: AuditSinkPort;
  clock: ClockPort;
  fileAssets: FileAssetRepository;
  fileAssetAccessGrants: FileAssetAccessGrantRepository;
  fileRetentionHolds: FileRetentionHoldRepository;
  fileScanResults: FileScanResultRepository;
  fileUploadSessions: FileUploadSessionRepository;
  objectStorage: ObjectStorageInspector;
  retentionPolicy: Readonly<{
    defaultRetentionDays: number;
    purposeRules: readonly {
      maxRetentionDays: number;
      minRetentionDays: number;
      purpose: string;
    }[];
  }>;
  scanner: FileScanPort;
  users: UserRepository;
  uuidGenerator: UuidGeneratorPort;
}>;

export type FileCompletionService = Readonly<{
  completeUpload(
    command: CompleteFileUploadCommand,
  ): Promise<FileUploadCompletionDto>;
  createRetentionHold(
    command: CreateFileRetentionHoldCommand,
  ): Promise<FileRetentionHoldRecord>;
  releaseRetentionHold(
    command: ReleaseFileRetentionHoldCommand,
  ): Promise<FileRetentionHoldRecord>;
  runRetentionJob(
    command: RunRetentionJobCommand,
  ): Promise<readonly FileRetentionDecisionDto[]>;
  getScanResult(assetId: Uuidv7): Promise<FileScanResultDto | null>;
}>;

const noopAuditSink: AuditSinkPort = Object.freeze({
  record() {
    return undefined;
  },
});

function normalizeChecksum(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new FileUploadCompletionValidationError(
      ['checksumSha256'],
      'checksumSha256 must be a 64-character hex string',
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
    throw new FileUploadCompletionValidationError(
      [field],
      `${field} must be a positive integer`,
    );
  }
  if (value > max) {
    throw new FileUploadCompletionValidationError(
      [field],
      `${field} must not exceed ${max} bytes`,
    );
  }
  return value;
}

function normalizeMimeType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw new FileUploadCompletionValidationError(
      ['mimeType'],
      'mimeType is required',
    );
  }
  return normalized.split(';', 1)[0]?.trim() ?? normalized;
}

function normalizeReason(value: string, field: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    throw new FileUploadCompletionValidationError(
      [field],
      `${field} is required`,
    );
  }
  if (normalized.length > 500) {
    throw new FileUploadCompletionValidationError(
      [field],
      `${field} must not exceed 500 characters`,
    );
  }
  return normalized;
}

async function ensureActiveUser(
  users: UserRepository,
  userId: Uuidv7,
): Promise<UserRecord> {
  const user = await users.findById(userId);
  if (!user) {
    throw new FileUploadSessionNotFoundError(`User ${userId} was not found`);
  }
  if (user.status !== 'ACTIVE') {
    throw new AuthorizationDeniedError('บัญชีผู้ใช้นี้ไม่สามารถใช้งานได้');
  }
  return user;
}

function toFileScanResultDto(record: FileScanResultRecord): FileScanResultDto {
  return Object.freeze({
    assetId: record.assetId,
    engineVersion: record.engineVersion,
    finishedAt: record.finishedAt,
    findings: Object.freeze([...record.findings]),
    id: record.id,
    rawArtifactPath: record.rawArtifactPath,
    scannerName: record.scannerName,
    startedAt: record.startedAt,
    verdict: record.verdict,
  });
}

async function recordAudit(
  auditSink: AuditSinkPort | undefined,
  input: Readonly<{
    details: Readonly<Record<string, string | number | boolean | null>>;
    occurredAt: UtcTimestamp;
    type: string;
    userId: Uuidv7 | null;
  }>,
): Promise<void> {
  await (auditSink ?? noopAuditSink).record({
    details: input.details,
    occurredAt: input.occurredAt,
    type: input.type,
    ...(input.userId !== null ? { userId: input.userId } : {}),
  });
}

function computeRetentionDeadline(
  policy: FileCompletionServicePorts['retentionPolicy'],
  asset: FileAssetRecord,
): UtcTimestamp {
  const rule = policy.purposeRules.find(
    (entry) => entry.purpose === asset.purpose,
  );
  const days = rule?.minRetentionDays ?? policy.defaultRetentionDays;
  const base = new Date(Date.parse(asset.createdAt));
  base.setUTCDate(base.getUTCDate() + days);
  return parseUtcTimestamp(base);
}

function findEligibleAssets(
  assets: readonly FileAssetRecord[],
  policy: FileCompletionServicePorts['retentionPolicy'],
  now: UtcTimestamp,
): readonly FileAssetRecord[] {
  return assets.filter((asset) => {
    if (asset.status === 'DELETED') {
      return false;
    }
    if (
      asset.status !== 'READY' &&
      asset.status !== 'REJECTED' &&
      asset.status !== 'QUARANTINED'
    ) {
      return false;
    }
    // An asset is eligible for deletion when the minimum retention window
    // has elapsed since it was created. We use strict greater-than so an
    // asset created moments ago is still within the window.
    const deadline = computeRetentionDeadline(policy, asset);
    return now > deadline;
  });
}

export function createFileCompletionService(
  input: FileCompletionServicePorts,
): FileCompletionService {
  return Object.freeze({
    async completeUpload(command): Promise<FileUploadCompletionDto> {
      const actor = await ensureActiveUser(input.users, command.actorUserId);
      const checksumSha256 = normalizeChecksum(command.checksumSha256);
      const expectedSizeBytes = normalizePositiveInteger(
        command.expectedSizeBytes,
        'expectedSizeBytes',
        5 * 1024 * 1024 * 1024,
      );
      const mimeType = normalizeMimeType(command.mimeType);

      const session = await input.fileUploadSessions.findById(
        command.sessionId,
      );
      if (!session) {
        throw new FileUploadSessionNotFoundError(
          `Upload session ${command.sessionId} was not found`,
        );
      }
      if (session.actorUserId !== actor.id) {
        throw new AuthorizationDeniedError(
          'คุณไม่มีสิทธิ์ยืนยันการอัปโหลดของผู้ใช้อื่น',
        );
      }
      if (session.status !== 'OPEN' && session.status !== 'IN_PROGRESS') {
        throw new FileUploadCompletionStateError(
          `cannot complete a ${session.status} session`,
        );
      }
      const now = input.clock.now();
      if (Date.parse(session.expiresAt) <= Date.parse(now)) {
        throw new FileUploadCompletionStateError('upload session has expired');
      }
      if (session.expectedSizeBytes !== expectedSizeBytes) {
        throw new FileUploadObjectSizeMismatchError(
          `expected ${session.expectedSizeBytes} bytes but command declared ${expectedSizeBytes}`,
        );
      }
      if (
        session.checksumSha256 !== null &&
        session.checksumSha256 !== checksumSha256
      ) {
        throw new FileUploadChecksumMismatchError(
          'declared checksum does not match the session-declared checksum',
        );
      }

      // Read the object from storage to verify size and MIME. The storage
      // adapter is responsible for failing closed on missing objects.
      const objectMetadata = await input.objectStorage.readObjectMetadata({
        mimeType: session.mimeType,
        objectKey: session.objectKey,
        storageProvider: session.storageProvider,
      });
      if (objectMetadata.sizeBytes !== expectedSizeBytes) {
        throw new FileUploadObjectSizeMismatchError(
          `object storage reports ${objectMetadata.sizeBytes} bytes, expected ${expectedSizeBytes}`,
        );
      }
      if (session.mimeType !== mimeType) {
        throw new FileUploadCompletionValidationError(
          ['mimeType'],
          `declared mime type ${mimeType} does not match session mime type ${session.mimeType}`,
        );
      }

      // Transition session to COMPLETED and asset to UPLOADED.
      const completedSession = await input.fileUploadSessions.update(
        Object.freeze({
          ...session,
          checksumSha256,
          receivedBytes: expectedSizeBytes,
          status: 'COMPLETED',
          updatedBy: actor.id,
        }),
        command.expectedVersion,
      );

      const currentAsset = await input.fileAssets.findById(session.assetId);
      if (!currentAsset) {
        throw new FileUploadSessionNotFoundError(
          `Asset ${session.assetId} not found for session ${session.id}`,
        );
      }

      const updatedAsset = await input.fileAssets.update(
        Object.freeze({
          ...currentAsset,
          checksumSha256,
          sizeBytes: expectedSizeBytes,
          status: 'UPLOADED',
          updatedBy: actor.id,
        }),
        currentAsset.version,
      );

      // Move the asset to QUARANTINED so that downstream consumers cannot
      // download it until the scan completes. The scan is invoked
      // synchronously here for the sandbox adapter; in production this
      // would be a worker job dispatched via outbox.
      const quarantinedAsset = await input.fileAssets.update(
        Object.freeze({
          ...updatedAsset,
          status: 'QUARANTINED',
          updatedBy: actor.id,
        }),
        updatedAsset.version,
      );

      const scanStartedAt = input.clock.now();
      const scan = await input.scanner.scan({
        assetId: quarantinedAsset.id,
        mimeType: quarantinedAsset.mimeType,
        objectKey: quarantinedAsset.objectKey,
        originalFilename: quarantinedAsset.originalFilename,
        sizeBytes: quarantinedAsset.sizeBytes,
      });

      const scanFinishedAt = input.clock.now();
      const persistedScan = await input.fileScanResults.create({
        assetId: quarantinedAsset.id,
        engineVersion: scan.engineVersion,
        finishedAt: scanFinishedAt,
        findings: scan.findings,
        id: input.uuidGenerator.next(),
        rawArtifactPath: scan.rawArtifactPath,
        scannerName: 'sandbox',
        startedAt: scanStartedAt,
        verdict: scan.verdict,
      });

      const nextStatus: FileAssetStatus =
        scan.verdict === 'CLEAN' || scan.verdict === 'SUSPICIOUS'
          ? 'SCANNING'
          : 'REJECTED';
      const scannedAsset = await input.fileAssets.update(
        Object.freeze({
          ...quarantinedAsset,
          status: nextStatus,
          updatedBy: actor.id,
        }),
        quarantinedAsset.version,
      );

      if (scan.verdict === 'MALICIOUS' || scan.verdict === 'ERROR') {
        await recordAudit(input.auditSink, {
          details: Object.freeze({
            assetId: scannedAsset.id,
            engineVersion: scan.engineVersion,
            objectKey: scannedAsset.objectKey,
            sessionId: session.id,
            verdict: scan.verdict,
          }),
          occurredAt: scanFinishedAt,
          type: 'file.scan.rejected',
          userId: actor.id,
        });
        throw new FileScanRejectedError(
          `file scan returned verdict ${scan.verdict}; asset marked REJECTED`,
        );
      }

      // Sandbox scanners that do not asynchronously re-check treat SCANNING
      // as a short-lived state. We immediately move SCANNING to READY for
      // CLEAN verdicts so the asset is downloadable.
      const finalAsset =
        scan.verdict === 'CLEAN'
          ? await input.fileAssets.update(
              Object.freeze({
                ...scannedAsset,
                status: 'READY',
                updatedBy: actor.id,
              }),
              scannedAsset.version,
            )
          : scannedAsset;

      await recordAudit(input.auditSink, {
        details: Object.freeze({
          assetId: finalAsset.id,
          bytes: expectedSizeBytes,
          checksumSha256,
          engineVersion: scan.engineVersion,
          findingCount: scan.findings.length,
          objectKey: finalAsset.objectKey,
          sessionId: session.id,
          verdict: scan.verdict,
        }),
        occurredAt: scanFinishedAt,
        type: 'file.upload.completed',
        userId: actor.id,
      });

      return Object.freeze({
        asset: Object.freeze({
          id: finalAsset.id,
          mimeType: finalAsset.mimeType,
          objectKey: finalAsset.objectKey,
          originalFilename: finalAsset.originalFilename,
          sizeBytes: finalAsset.sizeBytes,
          status: finalAsset.status,
          version: finalAsset.version,
          visibility: finalAsset.visibility,
        }),
        scanResult: {
          id: persistedScan.id,
          verdict: persistedScan.verdict,
        },
        sessionId: completedSession.id,
      });
    },

    async createRetentionHold(command): Promise<FileRetentionHoldRecord> {
      const asset = await input.fileAssets.findById(command.assetId);
      if (!asset) {
        throw new FileUploadSessionNotFoundError(
          `Asset ${command.assetId} was not found`,
        );
      }
      if (command.actorUserId !== null) {
        await ensureActiveUser(input.users, command.actorUserId);
      }
      const created = await input.fileRetentionHolds.create({
        assetId: asset.id,
        expiresAt: command.expiresAt ?? null,
        heldByUserId: command.actorUserId,
        id: input.uuidGenerator.next(),
        reason: command.reason,
      });
      await recordAudit(input.auditSink, {
        details: Object.freeze({
          assetId: asset.id,
          expiresAt: created.expiresAt,
          reason: created.reason,
        }),
        occurredAt: input.clock.now(),
        type: 'file.retention.hold_created',
        userId: command.actorUserId,
      });
      return created;
    },

    async releaseRetentionHold(command): Promise<FileRetentionHoldRecord> {
      const actor = await ensureActiveUser(input.users, command.actorUserId);
      const reason = normalizeReason(command.reason, 'reason');
      const hold = await input.fileRetentionHolds.findById(command.holdId);
      if (!hold) {
        throw new FileUploadSessionNotFoundError(
          `Retention hold ${command.holdId} was not found`,
        );
      }
      if (hold.releasedAt !== null) {
        throw new FileUploadCompletionStateError(
          'retention hold is already released',
        );
      }
      const now = input.clock.now();
      try {
        const released = await input.fileRetentionHolds.update(
          Object.freeze({
            ...hold,
            releasedAt: now,
            releasedByUserId: actor.id,
            releaseReason: reason,
            updatedBy: actor.id,
          }),
          command.expectedVersion,
        );
        await recordAudit(input.auditSink, {
          details: Object.freeze({
            assetId: hold.assetId,
            holdId: hold.id,
            reason,
          }),
          occurredAt: now,
          type: 'file.retention.hold_released',
          userId: actor.id,
        });
        return released;
      } catch (error) {
        if (error instanceof RepositoryConflictError) {
          throw new FileUploadCompletionStateError(
            'retention hold version conflict',
          );
        }
        throw error;
      }
    },

    async runRetentionJob(
      command,
    ): Promise<readonly FileRetentionDecisionDto[]> {
      const now = command.evaluatedAt ?? input.clock.now();
      const limit = command.limit ?? 100;

      // Read all assets via a paginated list. For the sandbox we use a
      // generous limit; production should use cursor pagination.
      const page = await input.fileAssets.list({
        limit,
        sort: { direction: 'asc', field: 'createdAt' },
      });

      const eligible = findEligibleAssets(
        page.items,
        input.retentionPolicy,
        now,
      );
      const decisions: FileRetentionDecisionDto[] = [];

      for (const asset of eligible) {
        const holdsPage = await input.fileRetentionHolds.list({
          filter: { activeAt: now, assetId: asset.id },
          limit: 10,
          sort: { direction: 'desc', field: 'createdAt' },
        });
        const activeHold = holdsPage.items[0];
        if (activeHold) {
          decisions.push(
            Object.freeze({
              assetId: asset.id,
              deleted: false,
              held: true,
              holdReason: activeHold.reason,
              reason: 'HELD',
            }),
          );
          continue;
        }
        // Mark asset as DELETED and emit audit event. Note that this
        // operation is idempotent: re-running the job on an already DELETED
        // asset would be filtered out by `findEligibleAssets`.
        await input.fileAssets.update(
          Object.freeze({
            ...asset,
            deletedAt: now,
            status: 'DELETED',
            updatedBy: command.actorUserId,
          }),
          asset.version,
        );
        await recordAudit(input.auditSink, {
          details: Object.freeze({
            assetId: asset.id,
            mimeType: asset.mimeType,
            objectKey: asset.objectKey,
            purpose: asset.purpose,
          }),
          occurredAt: now,
          type: 'file.retention.deleted',
          userId: command.actorUserId,
        });
        decisions.push(
          Object.freeze({
            assetId: asset.id,
            deleted: true,
            held: false,
            holdReason: null,
            reason: 'OUTSIDE_RETENTION_WINDOW',
          }),
        );
      }

      return Object.freeze(decisions);
    },

    async getScanResult(assetId): Promise<FileScanResultDto | null> {
      const record = await input.fileScanResults.findLatestForAsset(assetId);
      return record ? toFileScanResultDto(record) : null;
    },
  });
}

// Helper used internally to query a single session's status.
export type FileUploadSessionStatusReport = Readonly<{
  expiresAt: UtcTimestamp;
  receivedBytes: number;
  status: FileUploadSessionStatus;
}>;

export function describeUploadSession(
  session: FileUploadSessionRecord,
): FileUploadSessionStatusReport {
  return Object.freeze({
    expiresAt: session.expiresAt,
    receivedBytes: session.receivedBytes,
    status: session.status,
  });
}

// Helper used by the access service to detect expired grants.
export function isGrantActive(
  grant: FileAssetAccessGrantRecord,
  now: UtcTimestamp,
): boolean {
  if (grant.revokedAt !== null) {
    return false;
  }
  if (Date.parse(grant.expiresAt) <= Date.parse(now)) {
    return false;
  }
  return true;
}
