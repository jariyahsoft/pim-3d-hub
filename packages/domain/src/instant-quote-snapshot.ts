import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { CurrencyCode, UtcTimestamp, Uuidv7 } from './index.js';

// ── Statuses ──────────────────────────────────────────────────────────────

export const instantQuoteStatuses = [
  'ACTIVE',
  'RESERVED',
  'CONSUMED',
  'EXPIRED',
  'INVALIDATED',
] as const;
export type InstantQuoteStatus = (typeof instantQuoteStatuses)[number];

export const instantQuoteSortFields = [
  'createdAt',
  'updatedAt',
  'expiresAt',
] as const;
export type InstantQuoteSortField = (typeof instantQuoteSortFields)[number];

// ── Snapshot types ────────────────────────────────────────────────────────

export type InstantQuoteInputSnapshot = Readonly<{
  colorCode: string | null;
  hasSupport: boolean;
  isRush: boolean;
  materialCode: string;
  providerServiceId: Uuidv7;
  printerId: Uuidv7;
  qualityCode: string;
  quantity: number;
}>;

export type InstantQuoteLineItem = Readonly<{
  amountMinor: number;
  code: string;
}>;

// ── Record types ──────────────────────────────────────────────────────────

export type InstantQuoteRecord = Readonly<
  CanonicalRecord & {
    buyerId: Uuidv7;
    consumedOrderId: Uuidv7 | null;
    currency: CurrencyCode;
    expiresAt: UtcTimestamp;
    fileAssetId: Uuidv7;
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
  }
>;

export type CreateInstantQuoteInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  buyerId: Uuidv7;
  currency?: CurrencyCode;
  expiresAt: UtcTimestamp;
  fileAssetId: Uuidv7;
  id?: Uuidv7;
  inputSnapshot: InstantQuoteInputSnapshot;
  lineItems: readonly InstantQuoteLineItem[];
  modelAnalysisId: Uuidv7;
  pricingProfileId: Uuidv7;
  pricingProfileVersion: number;
  providerId: Uuidv7;
  reservationUnits: number;
  sourceRuleSetVersion: number;
  status?: InstantQuoteStatus;
  subtotalMinor: number;
  totalMinor: number;
  updatedBy?: Uuidv7 | null;
}>;

export type InstantQuoteFilter = Readonly<{
  buyerId?: Uuidv7;
  fileAssetId?: Uuidv7;
  providerId?: Uuidv7;
  status?: InstantQuoteStatus;
}>;

// ── Repository ────────────────────────────────────────────────────────────

export type InstantQuoteRepository = Readonly<{
  /**
   * Atomic create-or-get: returns the existing quote with the same idempotency
   * key when present, otherwise persists the new snapshot.
   */
  createIfNotExists(
    input: CreateInstantQuoteInput,
    idempotencyKey: string,
  ): Promise<Readonly<{ created: boolean; quote: InstantQuoteRecord }>>;
  findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<InstantQuoteRecord | null>;
  findByIdempotencyKey(
    buyerId: Uuidv7,
    idempotencyKey: string,
  ): Promise<InstantQuoteRecord | null>;
  list(
    request: RepositoryListRequest<InstantQuoteFilter, InstantQuoteSortField>,
  ): Promise<RepositoryListPage<InstantQuoteRecord>>;
  markConsumed(
    id: Uuidv7,
    orderId: Uuidv7,
    expectedVersion: number,
  ): Promise<InstantQuoteRecord>;
  markExpired(id: Uuidv7, expectedVersion: number): Promise<InstantQuoteRecord>;
  markInvalidated(
    id: Uuidv7,
    expectedVersion: number,
  ): Promise<InstantQuoteRecord>;
  reserve(
    id: Uuidv7,
    reservationId: Uuidv7,
    expectedVersion: number,
  ): Promise<InstantQuoteRecord>;
}>;

// ── State transitions ──────────────────────────────────────────────────────

const allowedTransitions: Record<InstantQuoteStatus, InstantQuoteStatus[]> = {
  ACTIVE: ['RESERVED', 'EXPIRED', 'INVALIDATED', 'CONSUMED'],
  RESERVED: ['CONSUMED', 'EXPIRED', 'INVALIDATED'],
  CONSUMED: [],
  EXPIRED: [],
  INVALIDATED: [],
};

export class InstantQuoteStateTransitionError extends Error {
  readonly code = 'STATE_TRANSITION_ERROR';
  readonly currentStatus: InstantQuoteStatus;
  readonly status = 422;
  readonly targetStatus: InstantQuoteStatus;

  constructor(input: {
    currentStatus: InstantQuoteStatus;
    targetStatus: InstantQuoteStatus;
  }) {
    super(
      `Instant quote cannot transition from ${input.currentStatus} to ${input.targetStatus}`,
    );
    this.name = 'InstantQuoteStateTransitionError';
    this.currentStatus = input.currentStatus;
    this.targetStatus = input.targetStatus;
  }
}

export function assertInstantQuoteTransition(
  current: InstantQuoteStatus,
  target: InstantQuoteStatus,
): void {
  if (!allowedTransitions[current].includes(target)) {
    throw new InstantQuoteStateTransitionError({
      currentStatus: current,
      targetStatus: target,
    });
  }
}
