import {
  type CalculatorResult,
  type CapacityReservationRecord,
  type CapacityReservationRepository,
  type CapacitySlotRecord,
  type CapacitySlotRepository,
  type CreateInstantQuoteInput,
  type InstantQuoteInputSnapshot,
  type InstantQuoteLineItem,
  type InstantQuoteRecord,
  type InstantQuoteRepository,
  type InstantQuoteStatus,
  type RepositoryListPage,
  type RepositoryListRequest,
  type UtcTimestamp,
  type Uuidv7,
  assertInstantQuoteTransition,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type CreateInstantQuoteCommand = Readonly<{
  actorUserId: Uuidv7;
  buyerId: Uuidv7;
  calculatorResult: CalculatorResult;
  expiresAt: UtcTimestamp;
  fileAssetId: Uuidv7;
  idempotencyKey: string;
  inputSnapshot: InstantQuoteInputSnapshot;
  modelAnalysisId: Uuidv7;
  pricingProfileId: Uuidv7;
  pricingProfileVersion: number;
  providerId: Uuidv7;
  reservationUnits: number;
  sourceRuleSetVersion: number;
}>;

export type ReserveInstantQuoteCommand = Readonly<{
  expectedVersion: number;
  idempotencyKey: string;
  printerId: Uuidv7;
  providerProfileId: Uuidv7;
  providerServiceId: Uuidv7;
  quoteId: Uuidv7;
  reservedByUserId: Uuidv7;
  slotId: Uuidv7;
  units: number;
}>;

export type ExpireInstantQuoteCommand = Readonly<{
  expectedVersion: number;
  quoteId: Uuidv7;
  reservationReleaseReason?: 'EXPIRED' | 'CANCELLED' | 'MANUAL';
}>;

export type ConsumeQuoteForOrderCommand = Readonly<{
  expectedVersion: number;
  orderId: Uuidv7;
  quoteId: Uuidv7;
}>;

export type ListQuotesQuery = Readonly<{
  buyerId?: Uuidv7;
  fileAssetId?: Uuidv7;
  limit: number;
  providerId?: Uuidv7;
  sortDirection?: 'asc' | 'desc';
  sortField?: 'createdAt' | 'updatedAt' | 'expiresAt';
  status?: InstantQuoteStatus;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type InstantQuoteDto = Readonly<{
  buyerId: Uuidv7;
  consumedOrderId: Uuidv7 | null;
  createdAt: UtcTimestamp;
  currency: string;
  expiresAt: UtcTimestamp;
  fileAssetId: Uuidv7;
  id: Uuidv7;
  inputSnapshot: InstantQuoteInputSnapshot;
  lineItems: readonly InstantQuoteLineItem[];
  modelAnalysisId: Uuidv7;
  pricingProfileId: Uuidv7;
  pricingProfileVersion: number;
  providerId: Uuidv7;
  reservationId: Uuidv7 | null;
  reservationUnits: number;
  sourceRuleSetVersion: number;
  status: InstantQuoteStatus;
  subtotalMinor: number;
  totalMinor: number;
  updatedAt: UtcTimestamp;
  version: number;
}>;

function toDto(rec: InstantQuoteRecord): InstantQuoteDto {
  return {
    id: rec.id,
    buyerId: rec.buyerId,
    currency: rec.currency,
    expiresAt: rec.expiresAt,
    fileAssetId: rec.fileAssetId,
    inputSnapshot: { ...rec.inputSnapshot },
    lineItems: [...rec.lineItems],
    consumedOrderId: rec.consumedOrderId,
    modelAnalysisId: rec.modelAnalysisId,
    pricingProfileId: rec.pricingProfileId,
    pricingProfileVersion: rec.pricingProfileVersion,
    providerId: rec.providerId,
    reservationId: rec.reservationId,
    reservationUnits: rec.reservationUnits,
    sourceRuleSetVersion: rec.sourceRuleSetVersion,
    status: rec.status,
    subtotalMinor: rec.subtotalMinor,
    totalMinor: rec.totalMinor,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
    version: rec.version,
  };
}

// ── Errors ────────────────────────────────────────────────────────────────

export class InstantQuoteNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(quoteId: Uuidv7) {
    super(`Instant quote ${quoteId} not found`);
    this.name = 'InstantQuoteNotFoundError';
  }
}

export class InstantQuoteExpiredError extends Error {
  readonly code = 'QUOTE_EXPIRED';
  readonly status = 422;

  constructor(quoteId: Uuidv7) {
    super(`Instant quote ${quoteId} has expired`);
    this.name = 'InstantQuoteExpiredError';
  }
}

export class InstantQuoteCapacityUnavailableError extends Error {
  readonly code = 'CAPACITY_UNAVAILABLE';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'InstantQuoteCapacityUnavailableError';
  }
}

export class InstantQuoteVersionConflictError extends Error {
  readonly code = 'RESOURCE_VERSION_CONFLICT';
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'InstantQuoteVersionConflictError';
  }
}

// ── Service ───────────────────────────────────────────────────────────────

export type InstantQuoteSnapshotService = Readonly<{
  consumeForOrder(
    command: ConsumeQuoteForOrderCommand,
  ): Promise<InstantQuoteDto>;
  createSnapshot(command: CreateInstantQuoteCommand): Promise<{
    created: boolean;
    quote: InstantQuoteDto;
  }>;
  expire(command: ExpireInstantQuoteCommand): Promise<InstantQuoteDto>;
  getById(quoteId: Uuidv7): Promise<InstantQuoteDto>;
  list(query: ListQuotesQuery): Promise<RepositoryListPage<InstantQuoteDto>>;
  reserve(command: ReserveInstantQuoteCommand): Promise<InstantQuoteDto>;
  runExpiryJob(now: UtcTimestamp): Promise<readonly InstantQuoteDto[]>;
}>;

export type InstantQuoteSnapshotServicePorts = Readonly<{
  capacityReservationRepository: CapacityReservationRepository;
  capacitySlotRepository: CapacitySlotRepository;
  instantQuoteRepository: InstantQuoteRepository;
  /** Returns true when capacity reservation succeeded; false when rejected
   *  because the slot doesn't have enough available units. */
  reserveCapacityPort?: {
    reserve(
      slotId: Uuidv7,
      units: number,
      reservation: CapacityReservationRecord,
    ): Promise<CapacitySlotRecord>;
  };
}>;

export function assertInstantQuoteVersionConflict(err: unknown): never {
  if (err instanceof Error && err.message.includes('version conflict')) {
    throw new InstantQuoteVersionConflictError(err.message);
  }
  throw err;
}

export function createInstantQuoteSnapshotService(
  ports: InstantQuoteSnapshotServicePorts,
): InstantQuoteSnapshotService {
  const repo = ports.instantQuoteRepository;
  const slotRepo = ports.capacitySlotRepository;
  const reservationRepo = ports.capacityReservationRepository;

  async function createSnapshot(
    command: CreateInstantQuoteCommand,
  ): Promise<{ created: boolean; quote: InstantQuoteDto }> {
    const input: CreateInstantQuoteInput = {
      actorUserId: command.actorUserId,
      buyerId: command.buyerId,
      expiresAt: command.expiresAt,
      fileAssetId: command.fileAssetId,
      inputSnapshot: command.inputSnapshot,
      lineItems: command.calculatorResult.lineItems,
      modelAnalysisId: command.modelAnalysisId,
      pricingProfileId: command.pricingProfileId,
      pricingProfileVersion: command.pricingProfileVersion,
      providerId: command.providerId,
      reservationUnits: command.reservationUnits,
      sourceRuleSetVersion: command.sourceRuleSetVersion,
      subtotalMinor: command.calculatorResult.subtotalMinor,
      totalMinor: command.calculatorResult.totalMinor,
    };

    const result = await repo.createIfNotExists(input, command.idempotencyKey);
    return { created: result.created, quote: toDto(result.quote) };
  }

  async function getById(quoteId: Uuidv7): Promise<InstantQuoteDto> {
    const rec = await repo.findById(quoteId);
    if (!rec) throw new InstantQuoteNotFoundError(quoteId);
    return toDto(rec);
  }

  async function reserve(
    command: ReserveInstantQuoteCommand,
  ): Promise<InstantQuoteDto> {
    // Check quote state and idempotency
    const existingByKey = await repo.findByIdempotencyKey(
      command.providerProfileId as unknown as Uuidv7,
      command.idempotencyKey,
    );

    if (existingByKey) {
      // Idempotency match: return existing reservation
      return toDto(existingByKey);
    }

    const existing = await repo.findById(command.quoteId);
    if (!existing) throw new InstantQuoteNotFoundError(command.quoteId);

    // Reject expired
    if (existing.status === 'EXPIRED') {
      throw new InstantQuoteExpiredError(command.quoteId);
    }

    if (existing.status !== 'ACTIVE') {
      throw new InstantQuoteCapacityUnavailableError(
        `Quote is in ${existing.status} state and cannot be reserved`,
      );
    }

    // Idempotent capacity reservation via repository
    const reservationResult = await reservationRepo.reserve({
      actorUserId: command.reservedByUserId,
      expiresAt: existing.expiresAt,
      idempotencyKey: command.idempotencyKey,
      printerId: command.printerId,
      providerProfileId: command.providerProfileId,
      providerServiceId: command.providerServiceId,
      requestHash: command.idempotencyKey,
      reservedByUserId: command.reservedByUserId,
      slotId: command.slotId,
      units: command.units,
    });
    const reservation: CapacityReservationRecord = reservationResult;
    void reservation;

    // Verify slot reservation
    const slot = await slotRepo.findSlotById(command.slotId);
    if (!slot || slot.reservedUnits + command.units > slot.totalUnits) {
      throw new InstantQuoteCapacityUnavailableError(
        `Slot ${command.slotId} cannot fulfill ${command.units} additional units`,
      );
    }

    // Mark quote as reserved
    assertInstantQuoteTransition(existing.status, 'RESERVED');
    try {
      const updated = await repo.reserve(
        command.quoteId,
        reservation.id,
        command.expectedVersion,
      );
      return toDto(updated);
    } catch (err) {
      assertInstantQuoteVersionConflict(err);
      throw err;
    }
  }

  async function consumeForOrder(
    command: ConsumeQuoteForOrderCommand,
  ): Promise<InstantQuoteDto> {
    const existing = await repo.findById(command.quoteId);
    if (!existing) throw new InstantQuoteNotFoundError(command.quoteId);

    // Only RESERVED or ACTIVE quotes may be consumed
    if (existing.status === 'CONSUMED') {
      throw new InstantQuoteCapacityUnavailableError(
        `Quote has already been consumed by order ${existing.consumedOrderId}`,
      );
    }
    if (existing.status === 'EXPIRED' || existing.status === 'INVALIDATED') {
      throw new InstantQuoteCapacityUnavailableError(
        `Quote is ${existing.status} and cannot be consumed`,
      );
    }

    assertInstantQuoteTransition(existing.status, 'CONSUMED');
    try {
      const updated = await repo.markConsumed(
        command.quoteId,
        command.orderId,
        command.expectedVersion,
      );
      return toDto(updated);
    } catch (err) {
      assertInstantQuoteVersionConflict(err);
      throw err;
    }
  }

  async function expire(
    command: ExpireInstantQuoteCommand,
  ): Promise<InstantQuoteDto> {
    const existing = await repo.findById(command.quoteId);
    if (!existing) throw new InstantQuoteNotFoundError(command.quoteId);

    if (
      existing.status === 'CONSUMED' ||
      existing.status === 'EXPIRED' ||
      existing.status === 'INVALIDATED'
    ) {
      // Already terminal
      return toDto(existing);
    }

    assertInstantQuoteTransition(existing.status, 'EXPIRED');

    // Release reservation if any
    if (existing.reservationId) {
      try {
        await reservationRepo.releaseReservation({
          actorUserId: null,
          reason: command.reservationReleaseReason ?? 'EXPIRED',
          reservationId: existing.reservationId,
        });
      } catch {
        // Best-effort; release may already be released in retry race
      }
    }

    try {
      const updated = await repo.markExpired(
        command.quoteId,
        command.expectedVersion,
      );
      return toDto(updated);
    } catch (err) {
      assertInstantQuoteVersionConflict(err);
      throw err;
    }
  }

  async function runExpiryJob(
    now: UtcTimestamp,
  ): Promise<readonly InstantQuoteDto[]> {
    const nowDate = new Date(now);
    // Walk through all quotes and find expired ones
    const page = await repo.list({
      filter: { status: 'ACTIVE' },
      limit: 200,
      sort: { direction: 'asc', field: 'expiresAt' },
    });

    const expired: InstantQuoteDto[] = [];
    for (const candidate of page.items) {
      const expiresAt = new Date(candidate.expiresAt);
      if (expiresAt > nowDate) break; // sorted ascending; rest are not expired

      const result = await expire({
        expectedVersion: candidate.version,
        quoteId: candidate.id,
      });
      expired.push(result);
    }

    // Also handle RESERVED quotes past expiry
    const reservedPage = await repo.list({
      filter: { status: 'RESERVED' },
      limit: 200,
      sort: { direction: 'asc', field: 'expiresAt' },
    });

    for (const candidate of reservedPage.items) {
      const expiresAt = new Date(candidate.expiresAt);
      if (expiresAt > nowDate) break;

      const result = await expire({
        expectedVersion: candidate.version,
        quoteId: candidate.id,
      });
      expired.push(result);
    }

    return expired;
  }

  async function list(
    query: ListQuotesQuery,
  ): Promise<RepositoryListPage<InstantQuoteDto>> {
    const request: RepositoryListRequest<
      Parameters<typeof repo.list>[0]['filter'],
      'createdAt' | 'updatedAt' | 'expiresAt'
    > = {
      cursor: undefined,
      filter: {
        buyerId: query.buyerId,
        fileAssetId: query.fileAssetId,
        providerId: query.providerId,
        status: query.status,
      },
      limit: query.limit,
      sort: {
        direction: query.sortDirection ?? 'desc',
        field: query.sortField ?? 'createdAt',
      },
    };
    const page = await repo.list(request as Parameters<typeof repo.list>[0]);
    return {
      items: page.items.map(toDto),
      nextCursor: page.nextCursor,
    };
  }

  return {
    consumeForOrder,
    createSnapshot,
    expire,
    getById,
    list,
    reserve,
    runExpiryJob,
  };
}
