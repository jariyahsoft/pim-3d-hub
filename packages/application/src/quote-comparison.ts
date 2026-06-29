import {
  type InstantQuoteRecord,
  type InstantQuoteRepository,
  type RepositoryListPage,
  type RepositoryListRequest,
  type Uuidv7,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type GatherQuoteComparisonQuery = Readonly<{
  actorUserId: Uuidv7;
  buyerId: Uuidv7;
  fileAssetId: Uuidv7;
  limit: number;
  sortDirection?: 'asc' | 'desc';
  sortField?: 'createdAt' | 'updatedAt' | 'expiresAt';
  statusFilter?: 'ACTIVE' | 'RESERVED';
}>;

export type InitiateCheckoutCommand = Readonly<{
  actorUserId: Uuidv7;
  buyerId: Uuidv7;
  quoteId: Uuidv7;
  idempotencyKey: string;
}>;

export type ManualFallbackRequestCommand = Readonly<{
  actorUserId: Uuidv7;
  buyerId: Uuidv7;
  budgetMinor: number | null;
  deliveryAddress: string;
  dueAt: string;
  fileAssetId: Uuidv7;
  materialCode: string;
  pickupOnly: boolean;
  qualityCode: string;
  quantity: number;
  requirements: string;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type QuoteComparisonItemDto = Readonly<{
  currency: string;
  expiresAt: string;
  fileAssetId: Uuidv7;
  id: Uuidv7;
  lineItems: ReadonlyArray<{ amountMinor: number; code: string }>;
  providerId: Uuidv7;
  providerName: string;
  quoteStatus: 'ACTIVE' | 'RESERVED' | 'CONSUMED' | 'EXPIRED' | 'INVALIDATED';
  reservationUnits: number;
  subtotalMinor: number;
  totalMinor: number;
}>;

export type CheckoutInitiationDto = Readonly<{
  expiresAt: string;
  quoteId: Uuidv7;
  redirectPath: string;
  totalMinor: number;
}>;

export type ManualFallbackDraftDto = Readonly<{
  buyerId: Uuidv7;
  budgetMinor: number | null;
  deliveryAddress: string;
  dueAt: string;
  fileAssetId: Uuidv7;
  materialCode: string;
  pickupOnly: boolean;
  qualityCode: string;
  quantity: number;
  requirements: string;
  serviceRequestDraftPath: string;
}>;

// ── Errors ────────────────────────────────────────────────────────────────

export class QuoteComparisonEmptyError extends Error {
  readonly code = 'QUOTE_COMPARISON_EMPTY';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'QuoteComparisonEmptyError';
  }
}

export class QuoteNotSelectedError extends Error {
  readonly code = 'QUOTE_NOT_SELECTED';
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'QuoteNotSelectedError';
  }
}

export class QuoteExpiredForCheckoutError extends Error {
  readonly code = 'QUOTE_EXPIRED';
  readonly status = 422;

  constructor(quoteId: Uuidv7) {
    super(`Quote ${quoteId} is no longer valid for checkout`);
    this.name = 'QuoteExpiredForCheckoutError';
  }
}

export class QuoteAlreadyConsumedError extends Error {
  readonly code = 'QUOTE_ALREADY_CONSUMED';
  readonly status = 409;

  constructor(quoteId: Uuidv7) {
    super(`Quote ${quoteId} has already been consumed by another order`);
    this.name = 'QuoteAlreadyConsumedError';
  }
}

// ── Service ───────────────────────────────────────────────────────────────

export type QuoteComparisonService = Readonly<{
  gatherQuotes(
    query: GatherQuoteComparisonQuery,
  ): Promise<RepositoryListPage<QuoteComparisonItemDto>>;
  initiateCheckout(
    command: InitiateCheckoutCommand,
  ): Promise<CheckoutInitiationDto>;
  prepareManualFallback(
    command: ManualFallbackRequestCommand,
  ): ManualFallbackDraftDto;
}>;

export type QuoteComparisonServicePorts = Readonly<{
  instantQuoteRepository: InstantQuoteRepository;
  providerNameLookupPort: {
    lookupProviderName(providerId: Uuidv7): Promise<string>;
  };
}>;

function toDto(
  rec: InstantQuoteRecord,
  providerName: string,
): QuoteComparisonItemDto {
  return {
    id: rec.id,
    providerId: rec.providerId,
    providerName,
    fileAssetId: rec.fileAssetId,
    currency: rec.currency,
    expiresAt: rec.expiresAt,
    quoteStatus: rec.status,
    reservationUnits: rec.reservationUnits,
    subtotalMinor: rec.subtotalMinor,
    totalMinor: rec.totalMinor,
    lineItems: rec.lineItems.map((l) => ({
      code: l.code,
      amountMinor: l.amountMinor,
    })),
  };
}

export function createQuoteComparisonService(
  ports: QuoteComparisonServicePorts,
): QuoteComparisonService {
  const repo = ports.instantQuoteRepository;

  async function gatherQuotes(
    query: GatherQuoteComparisonQuery,
  ): Promise<RepositoryListPage<QuoteComparisonItemDto>> {
    const request: RepositoryListRequest<
      Parameters<typeof repo.list>[0]['filter'],
      'createdAt' | 'updatedAt' | 'expiresAt'
    > = {
      cursor: undefined,
      filter: {
        buyerId: query.buyerId,
        fileAssetId: query.fileAssetId,
        status: query.statusFilter,
      },
      limit: query.limit,
      sort: {
        direction: query.sortDirection ?? 'asc',
        field: query.sortField ?? 'expiresAt',
      },
    };

    const page = await repo.list(request as Parameters<typeof repo.list>[0]);
    const items = await Promise.all(
      page.items.map(async (q) =>
        toDto(
          q,
          await ports.providerNameLookupPort.lookupProviderName(q.providerId),
        ),
      ),
    );
    return {
      items,
      nextCursor: page.nextCursor,
    };
  }

  async function initiateCheckout(
    command: InitiateCheckoutCommand,
  ): Promise<CheckoutInitiationDto> {
    const rec = await repo.findById(command.quoteId);
    if (!rec) {
      throw new QuoteNotSelectedError(`Quote ${command.quoteId} not found`);
    }
    if (rec.buyerId !== command.buyerId) {
      throw new QuoteNotSelectedError(
        `Quote ${command.quoteId} does not belong to the buyer`,
      );
    }
    if (rec.status === 'CONSUMED') {
      throw new QuoteAlreadyConsumedError(command.quoteId);
    }
    if (rec.status === 'EXPIRED' || rec.status === 'INVALIDATED') {
      throw new QuoteExpiredForCheckoutError(command.quoteId);
    }
    if (new Date(rec.expiresAt).getTime() <= Date.now()) {
      throw new QuoteExpiredForCheckoutError(command.quoteId);
    }
    return {
      quoteId: rec.id,
      expiresAt: rec.expiresAt,
      totalMinor: rec.totalMinor,
      redirectPath: `/checkout/${rec.id}`,
    };
  }

  function prepareManualFallback(
    command: ManualFallbackRequestCommand,
  ): ManualFallbackDraftDto {
    return {
      buyerId: command.buyerId,
      fileAssetId: command.fileAssetId,
      budgetMinor: command.budgetMinor,
      deliveryAddress: command.deliveryAddress,
      dueAt: command.dueAt,
      materialCode: command.materialCode,
      pickupOnly: command.pickupOnly,
      qualityCode: command.qualityCode,
      quantity: command.quantity,
      requirements: command.requirements,
      serviceRequestDraftPath: `/service-requests/new?asset=${command.fileAssetId}`,
    };
  }

  return {
    gatherQuotes,
    initiateCheckout,
    prepareManualFallback,
  };
}
