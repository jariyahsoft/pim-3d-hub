import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { UtcTimestamp, Uuidv7 } from './index.js';

// ── Promotion placements ───────────────────────────────────────────────────

export const promotionPlacementKinds = [
  'FEATURED_LISTING',
  'CATEGORY_HIGHLIGHT',
  'HOME_BANNER',
  'SEARCH_SPONSORED_SLOT',
] as const;
export type PromotionPlacementKind = (typeof promotionPlacementKinds)[number];

export const promotionStatuses = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type PromotionStatus = (typeof promotionStatuses)[number];

export const promotionSortFields = [
  'createdAt',
  'updatedAt',
  'startsAt',
  'endsAt',
] as const;
export type PromotionSortField = (typeof promotionSortFields)[number];

export const promotionTargetKinds = [
  'PRODUCT',
  'PROVIDER_PROFILE',
  'POST',
] as const;
export type PromotionTargetKind = (typeof promotionTargetKinds)[number];

const allowedPromotionTransitions: Record<PromotionStatus, PromotionStatus[]> =
  {
    DRAFT: ['SCHEDULED', 'ACTIVE', 'CANCELLED'],
    SCHEDULED: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
    ACTIVE: ['PAUSED', 'EXPIRED', 'CANCELLED'],
    PAUSED: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
    EXPIRED: [],
    CANCELLED: [],
  };

export class PromotionStateTransitionError extends Error {
  readonly code = 'STATE_TRANSITION_ERROR';
  readonly currentStatus: PromotionStatus;
  readonly status = 422;
  readonly targetStatus: PromotionStatus;

  constructor(input: {
    currentStatus: PromotionStatus;
    targetStatus: PromotionStatus;
  }) {
    super(
      `Promotion cannot transition from ${input.currentStatus} to ${input.targetStatus}`,
    );
    this.name = 'PromotionStateTransitionError';
    this.currentStatus = input.currentStatus;
    this.targetStatus = input.targetStatus;
  }
}

export function assertPromotionTransition(
  current: PromotionStatus,
  target: PromotionStatus,
): void {
  if (!allowedPromotionTransitions[current].includes(target)) {
    throw new PromotionStateTransitionError({
      currentStatus: current,
      targetStatus: target,
    });
  }
}

export type PromotionRecord = Readonly<
  CanonicalRecord & {
    approvedByUserId: Uuidv7 | null;
    budgetMinor: number;
    currency: string;
    endsAt: UtcTimestamp;
    goals: Readonly<Record<string, string>>;
    kind: PromotionPlacementKind;
    label: string;
    placementId: Uuidv7;
    reviewNotes: string | null;
    sellerId: Uuidv7;
    startsAt: UtcTimestamp;
    status: PromotionStatus;
    targetId: Uuidv7;
    targetKind: PromotionTargetKind;
  }
>;

export type CreatePromotionInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  budgetMinor: number;
  currency: string;
  endsAt: UtcTimestamp;
  goals?: Readonly<Record<string, string>>;
  kind: PromotionPlacementKind;
  label: string;
  placementId?: Uuidv7;
  sellerId: Uuidv7;
  startsAt: UtcTimestamp;
  status?: PromotionStatus;
  targetId: Uuidv7;
  targetKind: PromotionTargetKind;
}>;

export type PromotionFilter = Readonly<{
  placementId?: Uuidv7;
  sellerId?: Uuidv7;
  status?: PromotionStatus;
  targetId?: Uuidv7;
  targetKind?: PromotionTargetKind;
}>;

export type PromotionRepository = Readonly<{
  create(input: CreatePromotionInput): Promise<PromotionRecord>;
  findById(id: Uuidv7): Promise<PromotionRecord | null>;
  list(
    request: RepositoryListRequest<PromotionFilter, PromotionSortField>,
  ): Promise<RepositoryListPage<PromotionRecord>>;
  update(
    record: PromotionRecord,
    expectedVersion: number,
  ): Promise<PromotionRecord>;
}>;

export class PromotionError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'PromotionError';
  }
}

// ── Subscription plans ────────────────────────────────────────────────────

export const subscriptionStatuses = [
  'INACTIVE',
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'CANCELLED',
  'EXPIRED',
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export type SubscriptionEntitlement = Readonly<{
  code: string;
  maxValue: number;
  metric: string;
  periodLabel: string;
}>;

export type SubscriptionPlanRecord = Readonly<
  CanonicalRecord & {
    billingProviderCode: string;
    code: string;
    displayName: string;
    entitlements: readonly SubscriptionEntitlement[];
    priceMinor: number;
    status: SubscriptionStatus;
  }
>;

export type SubscriptionEntitlementGrant = Readonly<{
  endsAt: UtcTimestamp;
  grantedAt: UtcTimestamp;
  planCode: string;
  startsAt: UtcTimestamp;
  subscriptionId: string;
  userId: Uuidv7;
}>;

export function isEntitlementActive(
  grant: SubscriptionEntitlementGrant,
  now: UtcTimestamp,
): boolean {
  if (grant.startsAt > now) return false;
  if (grant.endsAt < now) return false;
  return true;
}

// ── Metrics (privacy-safe impressions/clicks/conversions) ─────────────────

export const metricEventKinds = ['IMPRESSION', 'CLICK', 'CONVERSION'] as const;
export type MetricEventKind = (typeof metricEventKinds)[number];

export type MetricEventRecord = Readonly<{
  actorUserId: Uuidv7 | null; // null when fully anonymous
  contentId: string;
  dedupeKey: string;
  kind: MetricEventKind;
  placementId: Uuidv7 | null;
  recordedAt: UtcTimestamp;
}>;

export class MetricInvalidError extends Error {
  readonly code = 'METRIC_INVALID';
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'MetricInvalidError';
  }
}

/**
 * Validate a metric event payload.  We refuse to store anything that could
 * leak identifying details beyond the dedupe key.
 */
export function validateMetricEvent(
  payload: Readonly<{
    actorUserId: string | null;
    contentId: string;
    dedupeKey: string;
    kind: MetricEventKind;
    placementId: string | null;
  }>,
): MetricEventRecord {
  if (!payload.contentId || payload.contentId.length === 0) {
    throw new MetricInvalidError('contentId is required');
  }
  if (!payload.dedupeKey || payload.dedupeKey.length === 0) {
    throw new MetricInvalidError('dedupeKey is required');
  }
  if (!payload.kind) {
    throw new MetricInvalidError('kind is required');
  }
  return {
    actorUserId: (payload.actorUserId ?? null) as Uuidv7 | null,
    contentId: payload.contentId,
    dedupeKey: payload.dedupeKey,
    kind: payload.kind,
    placementId: (payload.placementId ?? null) as Uuidv7 | null,
    recordedAt: new Date().toISOString() as UtcTimestamp,
  };
}
