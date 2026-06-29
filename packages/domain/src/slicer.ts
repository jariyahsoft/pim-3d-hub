import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { UtcTimestamp, Uuidv7 } from './index.js';

// ── Slicer profile ───────────────────────────────────────────────────────

export const slicerLicenseAcceptanceVersion = 1;

export const slicerProfiles = [
  'PRUSA_SLICER_2_8',
  'CURA_5_9',
  'SIMPLIFY3D_5_1',
] as const;
export type SlicerProfileCode = (typeof slicerProfiles)[number];

export const slicerProfileStatuses = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type SlicerProfileStatus = (typeof slicerProfileStatuses)[number];

export const slicerSortFields = ['createdAt', 'updatedAt'] as const;
export type SlicerSortField = (typeof slicerSortFields)[number];

// ── Versioned printer/material/quality profiles ──────────────────────────

export type SlicerProfileSettings = Readonly<{
  /** Layer height in mm — 0 if unsupported or default. */
  layerHeightMm: number;
  /** Infill percentage 0–100. */
  infillPercent: number;
  /** Support settings: 'NONE' | 'TOUCHING_BUILDPLATE' | 'EVERYWHERE' */
  supportType: string;
  /** Print speed in mm/s — 0 means profile default. */
  printSpeedMmPerSec: number;
  /** Temperature settings for extruder (°C). */
  extruderTempC: number;
  /** Bed temperature (°C). */
  bedTempC: number;
  /** Additional settings JSON blob — structured but opaque to the domain. */
  extraSettings: string;
}>;

export type SlicerLicenseAcceptance = Readonly<{
  acceptedVersion: number;
  acceptedAt: UtcTimestamp;
  licenseAgreement: string;
}>;

export type SlicerProfileRecord = Readonly<
  CanonicalRecord & {
    approvedByUserId: Uuidv7 | null;
    description: string;
    materialCode: string;
    printerTechnologyCode: string;
    profileCode: SlicerProfileCode;
    qualityCode: string;
    settings: SlicerProfileSettings;
    status: SlicerProfileStatus;
  }
>;

export type CreateSlicerProfileInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  description: string;
  materialCode: string;
  printerTechnologyCode: string;
  profileCode: SlicerProfileCode;
  qualityCode: string;
  settings: SlicerProfileSettings;
}>;

export type SlicerProfileFilter = Readonly<{
  materialCode?: string;
  profileCode?: SlicerProfileCode;
  qualityCode?: string;
  status?: SlicerProfileStatus;
  printerTechnologyCode?: string;
}>;

export type SlicerProfileRepository = Readonly<{
  create(input: CreateSlicerProfileInput): Promise<SlicerProfileRecord>;
  findById(id: Uuidv7): Promise<SlicerProfileRecord | null>;
  findActive(
    profileCode: SlicerProfileCode,
    printerTechnologyCode: string,
    materialCode: string,
    qualityCode: string,
  ): Promise<SlicerProfileRecord | null>;
  list(
    request: RepositoryListRequest<SlicerProfileFilter, SlicerSortField>,
  ): Promise<RepositoryListPage<SlicerProfileRecord>>;
  update(
    record: SlicerProfileRecord,
    expectedVersion: number,
  ): Promise<SlicerProfileRecord>;
}>;

// ── Slice request / job ──────────────────────────────────────────────────

export const sliceJobStatuses = [
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED_TRANSIENT',
  'FAILED_PERMANENT',
  'DEAD_LETTER',
] as const;
export type SliceJobStatus = (typeof sliceJobStatuses)[number];

export const sliceJobSortFields = ['createdAt', 'updatedAt'] as const;
export type SliceJobSortField = (typeof sliceJobSortFields)[number];

export type SliceEstimate = Readonly<{
  estimatedDurationSec: number;
  estimatedFilamentGrams: number;
  estimatedSupportGrams: number;
  estimatedCostMinor: number;
  profileCode: SlicerProfileCode;
  profileVersion: number;
  slicerLicenseVersion: number;
}>;

export type SliceJobRecord = Readonly<
  CanonicalRecord & {
    dedupeKey: string;
    fileAssetId: Uuidv7;
    profileId: Uuidv7;
    result: SliceEstimate | null;
    resultPath: string | null;
    status: SliceJobStatus;
  }
>;

export type CreateSliceJobInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  dedupeKey: string;
  fileAssetId: Uuidv7;
  profileId: Uuidv7;
}>;

export type SliceJobFilter = Readonly<{
  fileAssetId?: Uuidv7;
  status?: SliceJobStatus;
}>;

export type SliceJobRepository = Readonly<{
  create(input: CreateSliceJobInput): Promise<SliceJobRecord>;
  createIfNotExists(
    input: CreateSliceJobInput,
  ): Promise<Readonly<{ created: boolean; job: SliceJobRecord }>>;
  findById(id: Uuidv7): Promise<SliceJobRecord | null>;
  findPending(timeoutSince: UtcTimestamp): Promise<readonly SliceJobRecord[]>;
  list(
    request: RepositoryListRequest<SliceJobFilter, SliceJobSortField>,
  ): Promise<RepositoryListPage<SliceJobRecord>>;
  update(job: SliceJobRecord, expectedVersion: number): Promise<SliceJobRecord>;
  markDeadLetter(id: Uuidv7, expectedVersion: number): Promise<SliceJobRecord>;
}>;

// ── Errors ───────────────────────────────────────────────────────────────

export class SlicerError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'SlicerError';
  }
}

export class SlicerProfileNotFoundError extends SlicerError {
  constructor(id: Uuidv7) {
    super('PROFILE_NOT_FOUND', `Slicer profile ${id} not found`, 404);
    this.name = 'SlicerProfileNotFoundError';
  }
}

export class SlicerSandboxRejectedError extends SlicerError {
  constructor(message: string) {
    super('SANDBOX_REJECTED', message, 422);
    this.name = 'SlicerSandboxRejectedError';
  }
}
