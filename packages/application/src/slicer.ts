import {
  type CreateSliceJobInput,
  type SliceEstimate,
  type SliceJobRepository,
  type SliceJobStatus,
  type SlicerProfileRecord,
  type SlicerProfileRepository,
  type SlicerSortField,
  type SlicerProfileFilter,
  type SlicerProfileSettings,
  type Uuidv7,
  type RepositoryListPage,
  SlicerProfileNotFoundError,
  SlicerSandboxRejectedError,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type CreateSlicerProfileCommand = Readonly<{
  actorUserId: Uuidv7;
  description: string;
  materialCode: string;
  printerTechnologyCode: string;
  profileCode: import('@pim/domain').SlicerProfileCode;
  qualityCode: string;
  settings: SlicerProfileSettings;
}>;

export type SubmitSliceCommand = Readonly<{
  actorUserId: Uuidv7;
  dedupeKey: string;
  fileAssetId: Uuidv7;
  profileId: Uuidv7;
}>;

export type ProcessNextSliceCommand = Readonly<{
  actorUserId: Uuidv7;
  workerId: string;
}>;

export type SliceJobResult = Readonly<{
  estimate: SliceEstimate;
  job: SliceJobDto;
  workerId: string;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type SlicerProfileDto = Readonly<{
  approvedByUserId: Uuidv7 | null;
  description: string;
  id: Uuidv7;
  materialCode: string;
  printerTechnologyCode: string;
  profileCode: string;
  qualityCode: string;
  settings: SlicerProfileSettings;
  status: string;
  version: number;
}>;

export type SliceJobDto = Readonly<{
  createdAt: string;
  dedupeKey: string;
  fileAssetId: Uuidv7;
  id: Uuidv7;
  profileId: Uuidv7;
  result: SliceEstimate | null;
  status: SliceJobStatus;
  version: number;
}>;

// ── Sandbox port ─────────────────────────────────────────────────────────

export type SlicerSandboxPort = Readonly<{
  execute(input: {
    fileAssetId: Uuidv7;
    profile: SlicerProfileRecord;
  }): Promise<{
    durationMs: number;
    estimatedCostMinor: number;
    estimatedDurationSec: number;
    estimatedFilamentGrams: number;
    estimatedSupportGrams: number;
  }>;
  cleanup(jobId: Uuidv7): Promise<void>;
}>;

// ── Service ports ─────────────────────────────────────────────────────────

export type SlicerServicePorts = Readonly<{
  profileRepository: SlicerProfileRepository;
  jobRepository: SliceJobRepository;
  sandbox: SlicerSandboxPort;
}>;

// ── Errors ────────────────────────────────────────────────────────────────

export class SlicerServiceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'SlicerServiceError';
  }
}

// ── Service ───────────────────────────────────────────────────────────────

export type SlicerService = Readonly<{
  createProfile(command: CreateSlicerProfileCommand): Promise<SlicerProfileDto>;
  findProfile(profileId: Uuidv7): Promise<SlicerProfileDto>;
  listProfiles(
    filter: SlicerProfileFilter | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: SlicerSortField },
  ): Promise<RepositoryListPage<SlicerProfileDto>>;
  submitSlice(command: SubmitSliceCommand): Promise<SliceJobDto>;
  processNextJob(
    command: ProcessNextSliceCommand,
  ): Promise<SliceJobResult | null>;
}>;

export function createSlicerService(ports: SlicerServicePorts): SlicerService {
  const profileRepo = ports.profileRepository;
  const jobRepo = ports.jobRepository;
  const STALLED_TIMEOUT_MS = 300_000;

  async function createProfile(
    cmd: CreateSlicerProfileCommand,
  ): Promise<SlicerProfileDto> {
    const rec = await profileRepo.create({ ...cmd });
    return { ...rec, settings: { ...rec.settings } };
  }

  async function findProfile(profileId: Uuidv7): Promise<SlicerProfileDto> {
    const rec = await profileRepo.findById(profileId);
    if (!rec) throw new SlicerProfileNotFoundError(profileId);
    return { ...rec, settings: { ...rec.settings } };
  }

  async function listProfiles(
    filter: SlicerProfileFilter | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: SlicerSortField },
  ): Promise<RepositoryListPage<SlicerProfileDto>> {
    const page = await profileRepo.list({
      filter: filter ?? undefined,
      limit,
      sort,
    });
    return {
      items: page.items.map((r) => ({ ...r, settings: { ...r.settings } })),
      nextCursor: page.nextCursor,
    };
  }

  async function submitSlice(cmd: SubmitSliceCommand): Promise<SliceJobDto> {
    const profile = await profileRepo.findById(cmd.profileId);
    if (!profile) throw new SlicerProfileNotFoundError(cmd.profileId);
    const input: CreateSliceJobInput = {
      actorUserId: cmd.actorUserId,
      dedupeKey: cmd.dedupeKey,
      fileAssetId: cmd.fileAssetId,
      profileId: cmd.profileId,
    };
    const result = await jobRepo.createIfNotExists(input);
    return { ...result.job };
  }

  async function processNextJob(
    cmd: ProcessNextSliceCommand,
  ): Promise<SliceJobResult | null> {
    const pending = await jobRepo.findPending(
      new Date(Date.now() - STALLED_TIMEOUT_MS).toISOString(),
    );
    if (pending.length === 0) return null;
    const job = pending[0];

    const profile = await profileRepo.findById(job.profileId);
    if (!profile) return null;

    try {
      const processing = await jobRepo.update(
        { ...job, status: 'PROCESSING' },
        job.version,
      );
      const sandboxResult = await ports.sandbox.execute({
        fileAssetId: job.fileAssetId,
        profile,
      });
      const estimate: SliceEstimate = {
        estimatedDurationSec: sandboxResult.estimatedDurationSec,
        estimatedFilamentGrams: sandboxResult.estimatedFilamentGrams,
        estimatedSupportGrams: sandboxResult.estimatedSupportGrams,
        estimatedCostMinor: sandboxResult.estimatedCostMinor,
        profileCode: profile.profileCode,
        profileVersion: profile.version,
        slicerLicenseVersion: 1,
      };
      const completed = await jobRepo.update(
        { ...processing, status: 'COMPLETED', result: estimate },
        processing.version,
      );
      await ports.sandbox.cleanup(job.id);
      return { estimate, job: { ...completed }, workerId: cmd.workerId };
    } catch (err) {
      await ports.sandbox.cleanup(job.id);
      try {
        if (err instanceof SlicerSandboxRejectedError) {
          await jobRepo.update(
            { ...job, status: 'FAILED_PERMANENT' },
            job.version,
          );
        } else {
          const transient = await jobRepo.update(
            { ...job, status: 'FAILED_TRANSIENT' },
            job.version,
          );
          if (transient.version >= 3) {
            await jobRepo.markDeadLetter(job.id, transient.version);
          }
        }
      } catch {
        /* best effort */
      }
      return null;
    }
  }

  return {
    createProfile,
    findProfile,
    listProfiles,
    processNextJob,
    submitSlice,
  };
}
