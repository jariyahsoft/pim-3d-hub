import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { UtcTimestamp, Uuidv7 } from './index.js';

// File upload session status
export const fileUploadSessionStatuses = [
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'EXPIRED',
  'ABORTED',
  'FAILED',
] as const;

export const fileUploadSessionKinds = ['RESUMABLE', 'DIRECT'] as const;

export const fileUploadSessionResolutions = [
  'CHUNK_FINALIZED',
  'SESSION_COMPLETED',
  'SESSION_ABORTED',
] as const;

export type FileUploadSessionStatus =
  (typeof fileUploadSessionStatuses)[number];
export type FileUploadSessionKind = (typeof fileUploadSessionKinds)[number];
export type FileUploadSessionResolution =
  (typeof fileUploadSessionResolutions)[number];
export type FileUploadSessionSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'expiresAt';

export type FileUploadSessionRecord = Readonly<
  CanonicalRecord & {
    actorUserId: Uuidv7;
    assetId: Uuidv7;
    checksumSha256: string | null;
    expectedSizeBytes: number;
    expiresAt: UtcTimestamp;
    kind: FileUploadSessionKind;
    maxChunkBytes: number | null;
    mimeType: string;
    objectKey: string;
    organizationId: Uuidv7 | null;
    originalFilename: string;
    purpose: string;
    receivedBytes: number;
    receivedChunks: number;
    storageProvider: string;
    status: FileUploadSessionStatus;
    visibility:
      | 'PRIVATE'
      | 'ORDER_PARTICIPANTS'
      | 'ORGANIZATION'
      | 'PUBLIC_PREVIEW';
  }
>;

export type CreateFileUploadSessionInput = Readonly<{
  actorUserId: Uuidv7;
  assetId: Uuidv7;
  checksumSha256?: string | null;
  expectedSizeBytes: number;
  expiresAt: UtcTimestamp;
  id?: Uuidv7;
  kind?: FileUploadSessionKind;
  maxChunkBytes?: number | null;
  mimeType: string;
  objectKey: string;
  organizationId?: Uuidv7 | null;
  originalFilename: string;
  purpose: string;
  storageProvider: string;
  visibility?:
    | 'PRIVATE'
    | 'ORDER_PARTICIPANTS'
    | 'ORGANIZATION'
    | 'PUBLIC_PREVIEW';
}>;

export type FileUploadSessionFilter = Readonly<{
  actorUserId?: Uuidv7;
  assetId?: Uuidv7;
  status?: FileUploadSessionStatus;
}>;

export type FileUploadSessionRepository = Readonly<{
  create(input: CreateFileUploadSessionInput): Promise<FileUploadSessionRecord>;
  findById(id: Uuidv7): Promise<FileUploadSessionRecord | null>;
  list(
    request: RepositoryListRequest<
      FileUploadSessionFilter,
      FileUploadSessionSortField
    >,
  ): Promise<RepositoryListPage<FileUploadSessionRecord>>;
  update(
    session: FileUploadSessionRecord,
    expectedVersion: number,
  ): Promise<FileUploadSessionRecord>;
}>;

// File scan result (Task 43)
export const fileScanVerdicts = [
  'CLEAN',
  'SUSPICIOUS',
  'MALICIOUS',
  'TIMEOUT',
  'ERROR',
] as const;

export type FileScanVerdict = (typeof fileScanVerdicts)[number];
export type FileScanResultSortField = 'createdAt' | 'updatedAt';

export type FileScanResultRecord = Readonly<
  CanonicalRecord & {
    assetId: Uuidv7;
    engineVersion: string;
    finishedAt: UtcTimestamp | null;
    findings: readonly {
      category: string;
      detail: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }[];
    rawArtifactPath: string | null;
    scannerName: string;
    startedAt: UtcTimestamp;
    verdict: FileScanVerdict;
  }
>;

export type CreateFileScanResultInput = Readonly<{
  assetId: Uuidv7;
  engineVersion: string;
  finishedAt?: UtcTimestamp | null;
  findings?: readonly {
    category: string;
    detail: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }[];
  id?: Uuidv7;
  rawArtifactPath?: string | null;
  scannerName: string;
  startedAt: UtcTimestamp;
  verdict: FileScanVerdict;
}>;

export type FileScanResultFilter = Readonly<{
  assetId?: Uuidv7;
  verdict?: FileScanVerdict;
}>;

export type FileScanResultRepository = Readonly<{
  create(input: CreateFileScanResultInput): Promise<FileScanResultRecord>;
  findLatestForAsset(assetId: Uuidv7): Promise<FileScanResultRecord | null>;
  list(
    request: RepositoryListRequest<
      FileScanResultFilter,
      FileScanResultSortField
    >,
  ): Promise<RepositoryListPage<FileScanResultRecord>>;
}>;

// File retention hold (Task 43)
// Holds prevent the retention job from deleting a file asset even if the
// retention window has elapsed.
export const fileRetentionHoldReasons = [
  'ORDER_OPEN',
  'DISPUTE_OPEN',
  'LEGAL_HOLD',
  'TAX_RETENTION',
  'KYC_RETENTION',
] as const;

export type FileRetentionHoldReason = (typeof fileRetentionHoldReasons)[number];
export type FileRetentionHoldSortField =
  | 'createdAt'
  | 'expiresAt'
  | 'updatedAt';

export type FileRetentionHoldRecord = Readonly<
  CanonicalRecord & {
    assetId: Uuidv7;
    expiresAt: UtcTimestamp | null;
    heldByUserId: Uuidv7 | null;
    reason: FileRetentionHoldReason;
    releasedAt: UtcTimestamp | null;
    releasedByUserId: Uuidv7 | null;
    releaseReason: string | null;
  }
>;

export type CreateFileRetentionHoldInput = Readonly<{
  assetId: Uuidv7;
  expiresAt?: UtcTimestamp | null;
  heldByUserId?: Uuidv7 | null;
  id?: Uuidv7;
  reason: FileRetentionHoldReason;
}>;

export type FileRetentionHoldFilter = Readonly<{
  activeAt?: UtcTimestamp;
  assetId?: Uuidv7;
  reason?: FileRetentionHoldReason;
}>;

export type FileRetentionHoldRepository = Readonly<{
  create(input: CreateFileRetentionHoldInput): Promise<FileRetentionHoldRecord>;
  findById(id: Uuidv7): Promise<FileRetentionHoldRecord | null>;
  list(
    request: RepositoryListRequest<
      FileRetentionHoldFilter,
      FileRetentionHoldSortField
    >,
  ): Promise<RepositoryListPage<FileRetentionHoldRecord>>;
  update(
    hold: FileRetentionHoldRecord,
    expectedVersion: number,
  ): Promise<FileRetentionHoldRecord>;
}>;

// File retention policy (Task 43)
// A policy describes the minimum lifetime of file assets of a given purpose
// before they become eligible for deletion. Default is a short quarantine
// window for REJECTED/QUARANTINED assets.
export type FileRetentionPolicyRecord = Readonly<{
  defaultRetentionDays: number;
  policyId: string;
  purposeRules: readonly {
    maxRetentionDays: number;
    minRetentionDays: number;
    purpose: string;
  }[];
  schemaVersion: number;
}>;

export const FILE_RETENTION_DEFAULT_POLICY: FileRetentionPolicyRecord =
  Object.freeze({
    defaultRetentionDays: 90,
    policyId: 'default-v1',
    purposeRules: Object.freeze([
      Object.freeze({
        maxRetentionDays: 365,
        minRetentionDays: 30,
        purpose: 'MODEL_3D',
      }),
      Object.freeze({
        maxRetentionDays: 7,
        minRetentionDays: 0,
        purpose: 'QUARANTINED_FILE',
      }),
      Object.freeze({
        maxRetentionDays: 30,
        minRetentionDays: 7,
        purpose: 'KYC_DOCUMENT',
      }),
    ]),
    schemaVersion: 1,
  });
