import {
  type CreatePromotionInput,
  type PromotionFilter,
  type PromotionRecord,
  type PromotionRepository,
  type PromotionSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
  type SubscriptionEntitlementGrant,
  type SubscriptionPlanRecord,
  type Uuidv7,
  type UtcTimestamp,
  MetricEventKind,
  MetricInvalidError,
  PromotionError,
  assertPromotionTransition,
  isEntitlementActive,
  validateMetricEvent,
} from '@pim/domain';

// ── Commands ───────────────────────────────────────────────────────────────

export type CreatePromotionCommand = Readonly<{
  actorUserId: Uuidv7;
  budgetMinor: number;
  currency: string;
  endsAt: string;
  goals?: Readonly<Record<string, string>>;
  kind: import('@pim/domain').PromotionPlacementKind;
  label: string;
  sellerId: Uuidv7;
  startsAt: string;
  targetId: Uuidv7;
  targetKind: import('@pim/domain').PromotionTargetKind;
}>;

export type ActivatePromotionCommand = Readonly<{
  actorModeratorId: Uuidv7;
  expectedVersion: number;
  promotionId: Uuidv7;
}>;

export type TrackMetricCommand = Readonly<{
  actorUserId: string | null;
  contentId: string;
  dedupeKey: string;
  kind: import('@pim/domain').MetricEventKind;
  placementId?: string | null;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type PromotionDto = Readonly<{
  approvedByUserId: Uuidv7 | null;
  budgetMinor: number;
  currency: string;
  endsAt: string;
  goals: Readonly<Record<string, string>>;
  id: Uuidv7;
  kind: import('@pim/domain').PromotionPlacementKind;
  label: string;
  reviewNotes: string | null;
  sellerId: Uuidv7;
  startsAt: string;
  status: import('@pim/domain').PromotionStatus;
  targetId: Uuidv7;
  targetKind: import('@pim/domain').PromotionTargetKind;
  version: number;
}>;

function promotionToDto(rec: PromotionRecord): PromotionDto {
  return {
    id: rec.id,
    label: rec.label,
    kind: rec.kind,
    status: rec.status,
    startsAt: rec.startsAt,
    endsAt: rec.endsAt,
    sellerId: rec.sellerId,
    targetId: rec.targetId,
    targetKind: rec.targetKind,
    budgetMinor: rec.budgetMinor,
    currency: rec.currency,
    goals: { ...rec.goals },
    approvedByUserId: rec.approvedByUserId,
    reviewNotes: rec.reviewNotes,
    version: rec.version,
  };
}

export type EntitlementDto = Readonly<{
  active: boolean;
  endsAt: string;
  planCode: string;
  startsAt: string;
}>;

export function isUserEntitled(
  grants: readonly SubscriptionEntitlementGrant[],
  userId: Uuidv7,
  now: UtcTimestamp,
): boolean {
  return grants.some((g) => g.userId === userId && isEntitlementActive(g, now));
}

// ── Ports ─────────────────────────────────────────────────────────────────

export type PromotionSubscriptionPorts = Readonly<{
  promotionRepository: PromotionRepository;
  subscriptionPlanRepository: {
    findByCode(code: string): Promise<SubscriptionPlanRecord | null>;
    list(): Promise<readonly SubscriptionPlanRecord[]>;
  };
  subscriptionGrantRepository: {
    listForUser(
      userId: Uuidv7,
    ): Promise<readonly SubscriptionEntitlementGrant[]>;
  };
  metricEventPort: {
    record(
      payload: Readonly<{
        actorUserId: string | null;
        contentId: string;
        dedupeKey: string;
        kind: MetricEventKind;
        placementId: string | null;
      }>,
    ): Promise<void>;
  };
}>;

// ── Service ───────────────────────────────────────────────────────────────

export type PromotionSubscriptionService = Readonly<{
  createPromotion(command: CreatePromotionCommand): Promise<PromotionDto>;
  listPromotions(
    filter: PromotionFilter | null,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: PromotionSortField },
  ): Promise<RepositoryListPage<PromotionDto>>;
  activatePromotion(command: ActivatePromotionCommand): Promise<PromotionDto>;
  pausePromotion(
    promotionId: Uuidv7,
    expectedVersion: number,
  ): Promise<PromotionDto>;
  trackMetric(command: TrackMetricCommand): Promise<{ accepted: boolean }>;
}>;

export function createPromotionSubscriptionService(
  ports: PromotionSubscriptionPorts,
): PromotionSubscriptionService {
  const promotionRepo = ports.promotionRepository;

  async function createPromotion(
    command: CreatePromotionCommand,
  ): Promise<PromotionDto> {
    if (command.startsAt >= command.endsAt) {
      throw new PromotionError(
        'INVALID_DATES',
        'endsAt must be after startsAt',
        400,
      );
    }
    if (command.actorUserId !== command.sellerId) {
      throw new PromotionError(
        'AUTHORIZATION_DENIED',
        'Cannot create promotion on behalf of another seller',
        403,
      );
    }
    const input: CreatePromotionInput = {
      actorUserId: command.actorUserId,
      budgetMinor: command.budgetMinor,
      currency: command.currency,
      endsAt: command.endsAt,
      goals: command.goals,
      kind: command.kind,
      label: command.label,
      sellerId: command.sellerId,
      startsAt: command.startsAt,
      targetId: command.targetId,
      targetKind: command.targetKind,
      status: 'DRAFT',
    };
    const rec = await promotionRepo.create(input);
    return promotionToDto(rec);
  }

  async function activatePromotion(
    command: ActivatePromotionCommand,
  ): Promise<PromotionDto> {
    const rec = await promotionRepo.findById(command.promotionId);
    if (!rec) {
      throw new PromotionError(
        'PROMOTION_NOT_FOUND',
        `Promotion ${command.promotionId} not found`,
        404,
      );
    }
    if (rec.status === 'EXPIRED' || rec.endsAt < new Date().toISOString()) {
      throw new PromotionError(
        'PROMOTION_EXPIRED',
        'Promotion ends in past',
        422,
      );
    }
    assertPromotionTransition(rec.status, 'ACTIVE');
    const updated: PromotionRecord = {
      ...rec,
      status: 'ACTIVE',
      approvedByUserId: command.actorModeratorId,
    };
    try {
      const result = await promotionRepo.update(
        updated,
        command.expectedVersion,
      );
      return promotionToDto(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('version conflict')) {
        throw new PromotionError('VERSION_CONFLICT', err.message, 409);
      }
      throw err;
    }
  }

  async function pausePromotion(
    promotionId: Uuidv7,
    expectedVersion: number,
  ): Promise<PromotionDto> {
    const rec = await promotionRepo.findById(promotionId);
    if (!rec) {
      throw new PromotionError(
        'PROMOTION_NOT_FOUND',
        `Promotion ${promotionId} not found`,
        404,
      );
    }
    assertPromotionTransition(rec.status, 'PAUSED');
    const updated: PromotionRecord = {
      ...rec,
      status: 'PAUSED',
    };
    try {
      const result = await promotionRepo.update(updated, expectedVersion);
      return promotionToDto(result);
    } catch (err) {
      throw new PromotionError(
        'VERSION_CONFLICT',
        err instanceof Error ? err.message : 'failed',
        409,
      );
    }
  }

  async function listPromotions(
    filter: PromotionFilter | null,
    cursor: string | null,
    limit: number,
    sort: { direction: 'asc' | 'desc'; field: PromotionSortField },
  ): Promise<RepositoryListPage<PromotionDto>> {
    const request: RepositoryListRequest<PromotionFilter, PromotionSortField> =
      {
        cursor: cursor ?? undefined,
        filter: filter ?? undefined,
        limit,
        sort,
      };
    const page = await promotionRepo.list(request);
    return {
      items: page.items.map(promotionToDto),
      nextCursor: page.nextCursor,
    };
  }

  async function trackMetric(
    command: TrackMetricCommand,
  ): Promise<{ accepted: boolean }> {
    try {
      const validated = validateMetricEvent({
        actorUserId: command.actorUserId,
        contentId: command.contentId,
        dedupeKey: command.dedupeKey,
        kind: command.kind,
        placementId: command.placementId ?? null,
      });
      await ports.metricEventPort.record(validated);
      return { accepted: true };
    } catch (err) {
      if (err instanceof MetricInvalidError) {
        return { accepted: false };
      }
      throw err;
    }
  }

  return {
    activatePromotion,
    createPromotion,
    listPromotions,
    pausePromotion,
    trackMetric,
  };
}
