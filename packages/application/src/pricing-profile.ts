import {
  RepositoryConflictError,
  calculatePrice,
  parseUtcTimestamp,
  type CalculatorInput,
  type CalculatorResult,
  type CreatePricingProfileInput,
  type PricingProfileFilter,
  type PricingProfileRecord,
  type PricingProfileRepository,
  type PricingProfileSortField,
  type PricingProfileStatus,
  type RepositoryListPage,
  type RepositoryListRequest,
  type UtcTimestamp,
  type Uuidv7,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type CreatePricingProfileCommand = Readonly<{
  actorUserId: Uuidv7;
  currency?: string;
  effectiveFrom: UtcTimestamp;
  formula: PricingProfileRecord['formula'];
  name: string;
  providerProfileId: Uuidv7;
  scope: PricingProfileRecord['scope'];
}>;

export type UpdatePricingProfileCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  profileId: Uuidv7;
  updates: Partial<
    Pick<
      PricingProfileRecord,
      'currency' | 'effectiveFrom' | 'formula' | 'name' | 'scope'
    >
  >;
}>;

export type PublishPricingProfileCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  profileId: Uuidv7;
}>;

export type CalculatePricingCommand = Readonly<{
  input: CalculatorInput;
  profileId: Uuidv7;
}>;

export type ListPricingProfilesQuery = Readonly<{
  filter?: PricingProfileFilter;
  includeDeleted?: boolean;
  limit: number;
  sortField?: PricingProfileSortField;
  sortDirection?: 'asc' | 'desc';
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type PricingProfileDto = Readonly<{
  createdAt: UtcTimestamp;
  createdBy: Uuidv7 | null;
  currency: string;
  effectiveFrom: UtcTimestamp;
  formula: PricingProfileRecord['formula'];
  id: Uuidv7;
  name: string;
  providerProfileId: Uuidv7;
  scope: PricingProfileRecord['scope'];
  status: PricingProfileStatus;
  updatedAt: UtcTimestamp;
  updatedBy: Uuidv7 | null;
  version: number;
  versionNo: number;
}>;

function toDto(rec: PricingProfileRecord): PricingProfileDto {
  return {
    id: rec.id,
    schemaVersion: rec.schemaVersion,
    version: rec.version,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    createdBy: rec.createdBy,
    updatedBy: rec.updatedBy,
    name: rec.name,
    providerProfileId: rec.providerProfileId,
    scope: { ...rec.scope },
    currency: rec.currency,
    effectiveFrom: rec.effectiveFrom,
    formula: { ...rec.formula },
    status: rec.status,
    versionNo: rec.versionNo,
  };
}

// ── Errors ────────────────────────────────────────────────────────────────

export class PricingProfileNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(profileId: Uuidv7) {
    super(`Pricing profile ${profileId} not found`);
    this.name = 'PricingProfileNotFoundError';
  }
}

export class PricingProfileStateError extends Error {
  readonly code = 'STATE_TRANSITION_ERROR';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'PricingProfileStateError';
  }
}

export class PricingProfileVersionConflictError extends Error {
  readonly code = 'RESOURCE_VERSION_CONFLICT';
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'PricingProfileVersionConflictError';
  }
}

// ── Service ───────────────────────────────────────────────────────────────

export type PricingProfileService = Readonly<{
  calculatePrice(input: CalculatePricingCommand): Promise<CalculatorResult>;
  createDraft(command: CreatePricingProfileCommand): Promise<PricingProfileDto>;
  getById(profileId: Uuidv7): Promise<PricingProfileDto>;
  list(
    query: ListPricingProfilesQuery,
  ): Promise<RepositoryListPage<PricingProfileDto>>;
  publish(command: PublishPricingProfileCommand): Promise<PricingProfileDto>;
  updateDraft(command: UpdatePricingProfileCommand): Promise<PricingProfileDto>;
}>;

export type PricingProfileServicePorts = Readonly<{
  pricingProfileRepository: PricingProfileRepository;
}>;

export function assertPricingProfileVersionConflict(err: unknown): never {
  if (err instanceof RepositoryConflictError) {
    throw new PricingProfileVersionConflictError(err.message);
  }
  throw err;
}

export function createPricingProfileService(
  ports: PricingProfileServicePorts,
): PricingProfileService {
  const repo = ports.pricingProfileRepository;

  async function createDraft(
    command: CreatePricingProfileCommand,
  ): Promise<PricingProfileDto> {
    const input: CreatePricingProfileInput = {
      createdBy: command.actorUserId,
      currency: command.currency as PricingProfileRecord['currency'],
      effectiveFrom: command.effectiveFrom,
      formula: command.formula,
      name: command.name,
      providerProfileId: command.providerProfileId,
      scope: command.scope,
      status: 'DRAFT',
      updatedBy: command.actorUserId,
    };

    const rec = await repo.create(input);
    return toDto(rec);
  }

  async function updateDraft(
    command: UpdatePricingProfileCommand,
  ): Promise<PricingProfileDto> {
    const existing = await repo.findById(command.profileId);
    if (!existing) throw new PricingProfileNotFoundError(command.profileId);
    if (existing.status !== 'DRAFT') {
      throw new PricingProfileStateError(
        `Cannot edit a ${existing.status} profile. Only DRAFT profiles can be updated.`,
      );
    }

    const updated: PricingProfileRecord = {
      ...existing,
      ...command.updates,
      updatedBy: command.actorUserId,
    };

    try {
      const rec = await repo.update(updated, command.expectedVersion);
      return toDto(rec);
    } catch (err) {
      assertPricingProfileVersionConflict(err);
      throw err;
    }
  }

  async function publish(
    command: PublishPricingProfileCommand,
  ): Promise<PricingProfileDto> {
    const existing = await repo.findById(command.profileId);
    if (!existing) throw new PricingProfileNotFoundError(command.profileId);
    if (existing.status !== 'DRAFT') {
      throw new PricingProfileStateError(
        `Only DRAFT profiles can be published. Current status: ${existing.status}.`,
      );
    }

    // Retire any active profile with the same scope (excluding the current profile)
    // Also track the maximum versionNo for version assignment
    let maxVersionNo = 0;
    const allProfiles = await repo.list({
      filter: { providerProfileId: existing.providerProfileId },
      limit: 100,
      sort: { direction: 'desc', field: 'updatedAt' },
    });

    for (const candidate of allProfiles.items) {
      if (candidate.deletedAt) continue;
      const sameScope =
        candidate.scope.serviceId === existing.scope.serviceId &&
        candidate.scope.printerId === existing.scope.printerId &&
        candidate.scope.materialCode === existing.scope.materialCode;

      if (sameScope) {
        if (candidate.versionNo > maxVersionNo) {
          maxVersionNo = candidate.versionNo;
        }
        if (candidate.id !== existing.id && candidate.status === 'ACTIVE') {
          try {
            const retired: PricingProfileRecord = {
              ...candidate,
              status: 'RETIRED',
              updatedBy: command.actorUserId,
            };
            await repo.update(retired, candidate.version);
          } catch (err) {
            assertPricingProfileVersionConflict(err);
            throw err;
          }
        }
      }
    }

    const now = parseUtcTimestamp(new Date());

    const published: PricingProfileRecord = {
      ...existing,
      status: 'ACTIVE',
      versionNo: maxVersionNo + 1,
      updatedAt: now,
      updatedBy: command.actorUserId,
    };

    try {
      const rec = await repo.update(published, command.expectedVersion);
      return toDto(rec);
    } catch (err) {
      assertPricingProfileVersionConflict(err);
      throw err;
    }
  }

  async function getById(profileId: Uuidv7): Promise<PricingProfileDto> {
    const rec = await repo.findById(profileId);
    if (!rec) throw new PricingProfileNotFoundError(profileId);
    return toDto(rec);
  }

  async function calculatePriceCmd(
    cmd: CalculatePricingCommand,
  ): Promise<CalculatorResult> {
    const profile = await repo.findById(cmd.profileId);
    if (!profile) throw new PricingProfileNotFoundError(cmd.profileId);
    return calculatePrice(profile, cmd.input);
  }

  async function list(
    query: ListPricingProfilesQuery,
  ): Promise<RepositoryListPage<PricingProfileDto>> {
    const request: RepositoryListRequest<
      PricingProfileFilter,
      PricingProfileSortField
    > = {
      filter: query.filter,
      includeDeleted: query.includeDeleted,
      limit: query.limit,
      sort: {
        direction: query.sortDirection ?? 'desc',
        field: query.sortField ?? 'updatedAt',
      },
    };
    const page = await repo.list(request);
    return {
      items: page.items.map(toDto),
      nextCursor: page.nextCursor,
    };
  }

  return {
    calculatePrice: calculatePriceCmd,
    createDraft,
    getById,
    list,
    publish,
    updateDraft,
  };
}
