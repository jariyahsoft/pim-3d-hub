import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { UtcTimestamp, Uuidv7 } from './index.js';

// Analysis request / job status
export const modelAnalysisStatuses = [
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'DEAD_LETTER',
] as const;

export const modelAnalysisRetryCategories = [
  'NO_RETRY',
  'RETRY_TRANSIENT',
  'RETRY_THROTTLED',
] as const;

export type ModelAnalysisStatus = (typeof modelAnalysisStatuses)[number];
export type ModelAnalysisRetryCategory =
  (typeof modelAnalysisRetryCategories)[number];
export type ModelAnalysisSortField = 'createdAt' | 'updatedAt' | 'startedAt';

// Mesh health indicators produced by the analyzer.
export type MeshHealth = Readonly<{
  degenerateFacets: number;
  edgesManifold: boolean;
  hasSolidOrientation: boolean;
  holes: number;
  volumeClosed: boolean;
}>;

// Eligibility hints that feed into the pricing engine.
export type AnalysisEligibilityHints = Readonly<{
  materialSuggestion: string | null;
  maxAngleDeg: number | null;
  minWallThicknessMm: number | null;
  overhangPercentage: number | null;
  printVolumeEligible: boolean;
  shellThicknessWarning: boolean;
  supportRequired: boolean;
}>;

// Canonical analysis record produced by a sandboxed analyzer.
export type ModelAnalysisRecord = Readonly<
  CanonicalRecord & {
    analyzerVersion: string;
    assetId: Uuidv7;
    boundsMm: readonly [number, number, number]; // width, depth, height
    durationMs: number | null;
    eligibilityHints: AnalysisEligibilityHints;
    endedAt: UtcTimestamp | null;
    failureReason: string | null;
    fileAssetId: Uuidv7;
    meshHealth: MeshHealth;
    resourceProfile: Readonly<{
      maxMemoryBytes: number;
      maxTimeMs: number;
    }>;
    startedAt: UtcTimestamp | null;
    status: ModelAnalysisStatus;
    units: 'MM' | 'CM' | 'INCH' | 'UNKNOWN';
    volumeMm3: number;
  }
>;

export type CreateModelAnalysisInput = Readonly<{
  analyzerVersion: string;
  assetId: Uuidv7;
  boundsMm?: readonly [number, number, number];
  createdBy?: Uuidv7 | null;
  durationMs?: number | null;
  eligibilityHints?: AnalysisEligibilityHints;
  endedAt?: UtcTimestamp | null;
  failureReason?: string | null;
  fileAssetId: Uuidv7;
  id?: Uuidv7;
  meshHealth?: MeshHealth;
  resourceProfile?: Readonly<{
    maxMemoryBytes: number;
    maxTimeMs: number;
  }>;
  startedAt?: UtcTimestamp | null;
  status?: ModelAnalysisStatus;
  units?: 'MM' | 'CM' | 'INCH' | 'UNKNOWN';
  updatedBy?: Uuidv7 | null;
  volumeMm3?: number;
}>;

export type ModelAnalysisFilter = Readonly<{
  assetId?: Uuidv7;
  fileAssetId?: Uuidv7;
  status?: ModelAnalysisStatus;
}>;

export type ModelAnalysisRepository = Readonly<{
  create(input: CreateModelAnalysisInput): Promise<ModelAnalysisRecord>;
  findById(id: Uuidv7): Promise<ModelAnalysisRecord | null>;
  findLatestForAsset(assetId: Uuidv7): Promise<ModelAnalysisRecord | null>;
  list(
    request: RepositoryListRequest<ModelAnalysisFilter, ModelAnalysisSortField>,
  ): Promise<RepositoryListPage<ModelAnalysisRecord>>;
  update(
    analysis: ModelAnalysisRecord,
    expectedVersion: number,
  ): Promise<ModelAnalysisRecord>;
}>;

// Analysis request job record (used for queue/worker tracking).
export const analysisRequestStatuses = [
  'QUEUED',
  'IN_PROGRESS',
  'SUCCEEDED',
  'FAILED_TRANSIENT',
  'FAILED_PERMANENT',
  'DEAD_LETTER',
] as const;

export type AnalysisRequestStatus = (typeof analysisRequestStatuses)[number];
export type AnalysisRequestSortField = 'createdAt' | 'updatedAt';

export type AnalysisRequestRecord = Readonly<
  CanonicalRecord & {
    analysisId: Uuidv7 | null;
    assetId: Uuidv7;
    attemptCount: number;
    lastError: string | null;
    nextRetryAt: UtcTimestamp | null;
    retryCategory: ModelAnalysisRetryCategory;
    status: AnalysisRequestStatus;
    triggerEvent: string;
  }
>;

export type CreateAnalysisRequestInput = Readonly<{
  analysisId?: Uuidv7 | null;
  assetId: Uuidv7;
  attemptCount?: number;
  createdBy?: Uuidv7 | null;
  id?: Uuidv7;
  lastError?: string | null;
  nextRetryAt?: UtcTimestamp | null;
  retryCategory?: ModelAnalysisRetryCategory;
  status?: AnalysisRequestStatus;
  triggerEvent: string;
  updatedBy?: Uuidv7 | null;
}>;

export type AnalysisRequestFilter = Readonly<{
  assetId?: Uuidv7;
  status?: AnalysisRequestStatus;
}>;

export type AnalysisRequestRepository = Readonly<{
  create(input: CreateAnalysisRequestInput): Promise<AnalysisRequestRecord>;
  findById(id: Uuidv7): Promise<AnalysisRequestRecord | null>;
  list(
    request: RepositoryListRequest<
      AnalysisRequestFilter,
      AnalysisRequestSortField
    >,
  ): Promise<RepositoryListPage<AnalysisRequestRecord>>;
  update(
    request: AnalysisRequestRecord,
    expectedVersion: number,
  ): Promise<AnalysisRequestRecord>;
}>;
