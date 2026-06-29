import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import { createInMemoryPromotionRepository } from '@pim/infrastructure';
import { createPromotionSubscriptionService } from './promotion-subscription.js';
import type { Uuidv7 } from '@pim/domain';

const SELLER = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const OTHER = '00000000-0000-7000-0000-000000000002' as Uuidv7;
const MOD = '00000000-0000-7000-0000-000000000003' as Uuidv7;
const TARGET = '00000000-0000-7000-0000-000000000004' as Uuidv7;

function makeSvc() {
  const promoRepo = createInMemoryPromotionRepository();
  const events: any[] = [];
  const svc = createPromotionSubscriptionService({
    promotionRepository: promoRepo,
    subscriptionPlanRepository: {
      async findByCode() {
        return null;
      },
      async list() {
        return [];
      },
    },
    subscriptionGrantRepository: {
      async listForUser() {
        return [];
      },
    },
    metricEventPort: {
      async record(payload) {
        events.push(payload);
      },
    },
  });
  return { svc, events };
}

describe('PromotionSubscriptionService', () => {
  it('creates a promotion in DRAFT', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createPromotion({
      actorUserId: SELLER,
      budgetMinor: 50000,
      currency: 'THB',
      endsAt: '2027-01-01T00:00:00Z',
      kind: 'FEATURED_LISTING',
      label: 'Spring sale',
      sellerId: SELLER,
      startsAt: '2026-07-01T00:00:00Z',
      targetId: TARGET,
      targetKind: 'PRODUCT',
    });

    expect(dto.status).toBe('DRAFT');
    expect(dto.label).toBe('Spring sale');
  });

  it('rejects cross-seller promotion creation', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.createPromotion({
        actorUserId: OTHER,
        budgetMinor: 1,
        currency: 'THB',
        endsAt: '2027-01-01T00:00:00Z',
        kind: 'FEATURED_LISTING',
        label: 'X',
        sellerId: SELLER,
        startsAt: '2026-07-01T00:00:00Z',
        targetId: TARGET,
        targetKind: 'PRODUCT',
      }),
    ).rejects.toThrow(/behalf of another seller/);
  });

  it('activates a DRAFT promotion', async () => {
    const { svc } = makeSvc();
    const draft = await svc.createPromotion({
      actorUserId: SELLER,
      budgetMinor: 1000,
      currency: 'THB',
      endsAt: '2027-01-01T00:00:00Z',
      kind: 'FEATURED_LISTING',
      label: 'X',
      sellerId: SELLER,
      startsAt: '2026-07-01T00:00:00Z',
      targetId: TARGET,
      targetKind: 'PRODUCT',
    });

    const active = await svc.activatePromotion({
      actorModeratorId: MOD,
      expectedVersion: draft.version,
      promotionId: draft.id,
    });

    expect(active.status).toBe('ACTIVE');
    expect(active.approvedByUserId).toBe(MOD);
  });

  it('rejects invalid date range', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.createPromotion({
        actorUserId: SELLER,
        budgetMinor: 1,
        currency: 'THB',
        endsAt: '2026-01-01T00:00:00Z',
        kind: 'FEATURED_LISTING',
        label: 'X',
        sellerId: SELLER,
        startsAt: '2027-01-01T00:00:00Z',
        targetId: TARGET,
        targetKind: 'PRODUCT',
      }),
    ).rejects.toThrow(/after startsAt/);
  });

  it('rejects metric event with missing contentId', async () => {
    const { svc } = makeSvc();
    const r = await svc.trackMetric({
      actorUserId: null,
      contentId: '',
      dedupeKey: 'k',
      kind: 'IMPRESSION',
    });
    expect(r.accepted).toBe(false);
  });

  it('accepts valid metric event', async () => {
    const { svc, events } = makeSvc();
    const r = await svc.trackMetric({
      actorUserId: null,
      contentId: TARGET,
      dedupeKey: 'k1',
      kind: 'CLICK',
    });
    expect(r.accepted).toBe(true);
    expect(events).toHaveLength(1);
  });
});
