import { type ClockPort, type UuidGeneratorPort } from './identity.js';
import {
  RepositoryConflictError,
  type AnalysisEligibilityHints,
  type AnalysisRequestRecord,
  type AnalysisRequestRepository,
  type AnalysisRequestStatus,
  type MeshHealth,
  type ModelAnalysisRecord,
  type ModelAnalysisRepository,
  type ModelAnalysisStatus,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain';

// ── DTOs ─────────────────────────────────────────────────────────

export type ModelAnalysisDto = Readonly<{
  analyzerVersion: string;
  assetId: Uuidv7;
  boundsMm: readonly [number, number, number];
  createdAt: UtcTimestamp;
  durationMs: number | null;
  eligibilityHints: AnalysisEligibilityHints;
  endedAt: UtcTimestamp | null;
  failureReason: string | null;
  fileAssetId: Uuidv7;
  id: Uuidv7;
  meshHealth: MeshHealth;
  startedAt: UtcTimestamp | null;
  status: ModelAnalysisStatus;
  units: 'MM' | 'CM' | 'INCH' | 'UNKNOWN';
  version: number;
  volumeMm3: number;
}>;

export type AnalysisRequestDto = Readonly<{
  analysisId: Uuidv7 | null;
  attemptCount: number;
  assetId: Uuidv7;
  id: Uuidv7;
  lastError: string | null;
  nextRetryAt: UtcTimestamp | null;
  retryCategory: 'NO_RETRY' | 'RETRY_TRANSIENT' | 'RETRY_THROTTLED';
  status: AnalysisRequestStatus;
  triggerEvent: string;
  version: number;
}>;

// ── Ports ────────────────────────────────────────────────────────

export type ModelAnalyzerPort = Readonly<{
  analyze(
    input: Readonly<{
      assetId: Uuidv7;
      fileAssetId: Uuidv7;
      maxMemoryBytes: number;
      maxTimeMs: number;
      objectKey: string;
      originalFilename: string;
      storageProvider: string;
    }>,
  ): Promise<
    Readonly<{
      analyzerVersion: string;
      boundsMm: readonly [number, number, number];
      durationMs: number;
      eligibilityHints: AnalysisEligibilityHints;
      meshHealth: MeshHealth;
      units: 'MM' | 'CM' | 'INCH' | 'UNKNOWN';
      volumeMm3: number;
    }>
  >;
}>;

// ── Errors ───────────────────────────────────────────────────────

export class ModelAnalysisNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'ModelAnalysisNotFoundError';
  }
}

export class ModelAnalysisDuplicateError extends Error {
  readonly code = 'IDEMPOTENCY_CONFLICT';
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ModelAnalysisDuplicateError';
  }
}

export class ModelAnalysisUnsupportedFileError extends Error {
  readonly code = 'FILE_TYPE_UNSUPPORTED';
  readonly status = 415;
  constructor(message: string) {
    super(message);
    this.name = 'ModelAnalysisUnsupportedFileError';
  }
}

export class ModelAnalysisDeferredError extends Error {
  readonly code = 'ANALYSIS_DEFERRED';
  readonly status = 202;
  constructor(message: string) {
    super(message);
    this.name = 'ModelAnalysisDeferredError';
  }
}

// ── Configuration ────────────────────────────────────────────────

const MAX_MEMORY_BYTES = 512 * 1024 * 1024; // 512 MiB
const MAX_TIME_MS = 30_000; // 30 seconds
const SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set([
  '.stl',
  '.obj',
  '.3mf',
]);
const RETRY_BACKOFF_MS = [5_000, 15_000, 60_000, 300_000] as const; // 5s, 15s, 1m, 5m

// ── Commands ─────────────────────────────────────────────────────

export type SubmitForAnalysisCommand = Readonly<{
  assetId: Uuidv7;
  fileAssetId: Uuidv7;
  objectKey: string;
  originalFilename: string;
  storageProvider: string;
  triggerEvent?: string;
}>;

export type ProcessAnalysisCommand = Readonly<{
  requestId: Uuidv7;
}>;

export type RetryAnalysisCommand = Readonly<{
  requestId: Uuidv7;
}>;

// ── Service ──────────────────────────────────────────────────────

export type ModelAnalysisServicePorts = Readonly<{
  analysisRequests: AnalysisRequestRepository;
  analyzer: ModelAnalyzerPort;
  clock: ClockPort;
  fileAnalyses: ModelAnalysisRepository;
  uuidGenerator: UuidGeneratorPort;
}>;

export type ModelAnalysisService = Readonly<{
  getLatestAnalysis(assetId: Uuidv7): Promise<ModelAnalysisDto | null>;
  getRequest(requestId: Uuidv7): Promise<AnalysisRequestDto | null>;
  processAnalysis(command: ProcessAnalysisCommand): Promise<ModelAnalysisDto>;
  retryAnalysis(command: RetryAnalysisCommand): Promise<AnalysisRequestDto>;
  submitForAnalysis(
    command: SubmitForAnalysisCommand,
  ): Promise<AnalysisRequestDto>;
}>;

// ── Helpers ──────────────────────────────────────────────────────

function detectExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot < 0 ? '' : filename.slice(dot).toLowerCase();
}

function toDto(record: ModelAnalysisRecord): ModelAnalysisDto {
  return Object.freeze({
    analyzerVersion: record.analyzerVersion,
    assetId: record.assetId,
    boundsMm: record.boundsMm,
    createdAt: record.createdAt,
    durationMs: record.durationMs,
    eligibilityHints: record.eligibilityHints,
    endedAt: record.endedAt,
    failureReason: record.failureReason,
    fileAssetId: record.fileAssetId,
    id: record.id,
    meshHealth: record.meshHealth,
    startedAt: record.startedAt,
    status: record.status,
    units: record.units,
    version: record.version,
    volumeMm3: record.volumeMm3,
  });
}

function toRequestDto(record: AnalysisRequestRecord): AnalysisRequestDto {
  return Object.freeze({
    analysisId: record.analysisId,
    attemptCount: record.attemptCount,
    assetId: record.assetId,
    id: record.id,
    lastError: record.lastError,
    nextRetryAt: record.nextRetryAt,
    retryCategory: record.retryCategory,
    status: record.status,
    triggerEvent: record.triggerEvent,
    version: record.version,
  });
}

function computeNextRetry(
  attempt: number,
  now: UtcTimestamp,
): UtcTimestamp | null {
  const index = Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1);
  const delayMs = RETRY_BACKOFF_MS[index]!;
  const next = new Date(Date.parse(now) + delayMs);
  return next.toISOString() as UtcTimestamp;
}

function classifyRetry(
  errorMessage: string,
): 'NO_RETRY' | 'RETRY_TRANSIENT' | 'RETRY_THROTTLED' {
  const msg = errorMessage.toLowerCase();
  if (
    msg.includes('timeout') ||
    msg.includes('memory') ||
    msg.includes('oom') ||
    msg.includes('crash')
  ) {
    return 'NO_RETRY';
  }
  if (
    msg.includes('rate') ||
    msg.includes('throttle') ||
    msg.includes('too many')
  ) {
    return 'RETRY_THROTTLED';
  }
  if (
    msg.includes('network') ||
    msg.includes('unavailable') ||
    msg.includes('timeout')
  ) {
    return 'RETRY_TRANSIENT';
  }
  return 'NO_RETRY';
}

function buildDefaultEligibilityHints(): AnalysisEligibilityHints {
  return Object.freeze({
    materialSuggestion: null,
    maxAngleDeg: null,
    minWallThicknessMm: null,
    overhangPercentage: null,
    printVolumeEligible: true,
    shellThicknessWarning: false,
    supportRequired: false,
  });
}

function buildDefaultMeshHealth(): MeshHealth {
  return Object.freeze({
    degenerateFacets: 0,
    edgesManifold: true,
    hasSolidOrientation: true,
    holes: 0,
    volumeClosed: true,
  });
}

// ── Service Factory ─────────────────────────────────────────────

export function createModelAnalysisService(
  input: ModelAnalysisServicePorts,
): ModelAnalysisService {
  return Object.freeze({
    async submitForAnalysis(command): Promise<AnalysisRequestDto> {
      const ext = detectExtension(command.originalFilename);
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        throw new ModelAnalysisUnsupportedFileError(
          `analysis not supported for extension ${ext}; supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}`,
        );
      }

      const requestId = input.uuidGenerator.next();
      const request = await input.analysisRequests.create({
        assetId: command.assetId,
        id: requestId,
        retryCategory: 'RETRY_TRANSIENT' as const,
        status: 'QUEUED',
        triggerEvent: command.triggerEvent ?? 'file.ready',
      });

      // Create the analysis record immediately in PENDING to reserve the
      // ID and indicate an analysis is in progress.
      await input.fileAnalyses.create({
        analyzerVersion: '',
        assetId: command.assetId,
        boundsMm: [0, 0, 0],
        createdBy: null,
        fileAssetId: command.fileAssetId,
        id: input.uuidGenerator.next(),
        resourceProfile: {
          maxMemoryBytes: MAX_MEMORY_BYTES,
          maxTimeMs: MAX_TIME_MS,
        },
        status: 'PENDING',
        units: 'UNKNOWN',
        volumeMm3: 0,
      });

      return toRequestDto(request);
    },

    async processAnalysis(command): Promise<ModelAnalysisDto> {
      let request = await input.analysisRequests.findById(command.requestId);
      if (!request) {
        throw new ModelAnalysisNotFoundError(
          `Analysis request ${command.requestId} was not found`,
        );
      }
      if (request.status !== 'QUEUED' && request.status !== 'IN_PROGRESS') {
        throw new ModelAnalysisDuplicateError(
          `analysis request ${command.requestId} is already ${request.status}`,
        );
      }

      const now = input.clock.now();
      request = await input.analysisRequests.update(
        Object.freeze({
          ...request,
          status: 'IN_PROGRESS' as AnalysisRequestStatus,
          updatedBy: null,
        }),
        request.version,
      );

      try {
        const startTime = Date.parse(now);
        const result = await input.analyzer.analyze({
          assetId: request.assetId,
          fileAssetId: request.assetId,
          maxMemoryBytes: MAX_MEMORY_BYTES,
          maxTimeMs: MAX_TIME_MS,
          objectKey: '',
          originalFilename: '',
          storageProvider: 'STANDARD',
        });
        const endTime = Date.now();
        const durationMs = endTime - startTime;

        const endedAt = new Date(endTime).toISOString() as UtcTimestamp;
        const analysisId = input.uuidGenerator.next();
        const meshHealth: MeshHealth =
          result.meshHealth ?? buildDefaultMeshHealth();
        const eligibilityHints =
          result.eligibilityHints ?? buildDefaultEligibilityHints();

        const record = await input.fileAnalyses.create({
          analyzerVersion: result.analyzerVersion,
          assetId: request.assetId,
          boundsMm: result.boundsMm,
          createdBy: null,
          durationMs,
          eligibilityHints,
          endedAt,
          failureReason: null,
          fileAssetId: request.assetId,
          id: analysisId,
          meshHealth,
          resourceProfile: {
            maxMemoryBytes: MAX_MEMORY_BYTES,
            maxTimeMs: MAX_TIME_MS,
          },
          startedAt: now,
          status: 'COMPLETED',
          units: result.units,
          volumeMm3: result.volumeMm3,
        });

        // Mark the request SUCCEEDED.
        await input.analysisRequests.update(
          Object.freeze({
            ...request,
            analysisId,
            status: 'SUCCEEDED' as AnalysisRequestStatus,
            updatedBy: null,
          }),
          request.version,
        );

        return toDto(record);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown analysis error';
        const category = classifyRetry(errorMessage);
        const nextRetry =
          category === 'NO_RETRY'
            ? null
            : computeNextRetry(request.attemptCount + 1, now);
        const newStatus: AnalysisRequestStatus =
          category === 'NO_RETRY'
            ? 'FAILED_PERMANENT'
            : request.attemptCount >= RETRY_BACKOFF_MS.length
              ? 'DEAD_LETTER'
              : 'FAILED_TRANSIENT';

        await input.analysisRequests.update(
          Object.freeze({
            ...request,
            attemptCount: request.attemptCount + 1,
            lastError: errorMessage,
            nextRetryAt: nextRetry,
            retryCategory: category,
            status: newStatus,
            updatedBy: null,
          }),
          request.version,
        );

        if (newStatus === 'DEAD_LETTER' || newStatus === 'FAILED_PERMANENT') {
          const pendingAnalysis = await input.fileAnalyses.findLatestForAsset(
            request.assetId,
          );
          if (pendingAnalysis) {
            await input.fileAnalyses.update(
              Object.freeze({
                ...pendingAnalysis,
                failureReason: errorMessage,
                status: 'FAILED' as ModelAnalysisStatus,
                updatedBy: null,
              }),
              pendingAnalysis.version,
            );
          }
        }

        throw new ModelAnalysisDeferredError(
          `analysis failed (${newStatus}) after ${request.attemptCount + 1} attempts: ${errorMessage}`,
        );
      }
    },

    async retryAnalysis(command): Promise<AnalysisRequestDto> {
      const request = await input.analysisRequests.findById(command.requestId);
      if (!request) {
        throw new ModelAnalysisNotFoundError(
          `Analysis request ${command.requestId} was not found`,
        );
      }
      if (
        request.status !== 'FAILED_TRANSIENT' &&
        request.status !== 'DEAD_LETTER'
      ) {
        throw new ModelAnalysisDuplicateError(
          `analysis request ${command.requestId} is ${request.status}, not retryable`,
        );
      }

      const updated = await input.analysisRequests.update(
        Object.freeze({
          ...request,
          nextRetryAt: null,
          status: 'QUEUED' as AnalysisRequestStatus,
          updatedBy: null,
        }),
        request.version,
      );
      return toRequestDto(updated);
    },

    async getLatestAnalysis(assetId): Promise<ModelAnalysisDto | null> {
      const record = await input.fileAnalyses.findLatestForAsset(assetId);
      return record ? toDto(record) : null;
    },

    async getRequest(requestId): Promise<AnalysisRequestDto | null> {
      const record = await input.analysisRequests.findById(requestId);
      return record ? toRequestDto(record) : null;
    },
  });
}

// ── Assert helpers ──────────────────────────────────────────────

export function assertModelAnalysisVersionConflict(
  error: unknown,
): error is RepositoryConflictError {
  return error instanceof RepositoryConflictError;
}
