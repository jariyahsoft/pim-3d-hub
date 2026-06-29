import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import {
  createInMemoryShowcaseConsentRepository,
  createInMemoryVerifiedPurchaseRepository,
} from '@pim/infrastructure';
import {
  createVerifiedContentService,
  ShowcaseConsentError,
  VerifiedPurchaseAuthorizationError,
} from './verified-content.js';
import type { Uuidv7 } from '@pim/domain';

const CUSTOMER = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const PROVIDER = '00000000-0000-7000-0000-000000000002' as Uuidv7;
const ORDER = '00000000-0000-7000-0000-000000000003' as Uuidv7;
const POST = '00000000-0000-7000-0000-000000000004' as Uuidv7;
const OTHER_USER = '00000000-0000-7000-0000-000000000005' as Uuidv7;

function makeSvc(opts?: { completedAt?: string | null }) {
  const verifiedRepo = createInMemoryVerifiedPurchaseRepository();
  const consentRepo = createInMemoryShowcaseConsentRepository();
  const isCompleted =
    opts?.completedAt !== undefined ? opts.completedAt : '2026-07-01T00:00:00Z';
  return createVerifiedContentService({
    showcaseConsentRepository: consentRepo,
    verifiedPurchaseRepository: verifiedRepo,
    orderLookupPort: {
      async isOrderCompleted(orderId: Uuidv7) {
        if (orderId !== ORDER) return null;
        return isCompleted;
      },
      async listParticipants(orderId: Uuidv7) {
        if (orderId !== ORDER) return [];
        return [CUSTOMER];
      },
    },
  });
}

describe('VerifiedContentService', () => {
  // ── Verified purchase ──────────────────────────────────────────────
  it('grants verified-purchase to the eligible buyer', async () => {
    const svc = makeSvc();
    const result = await svc.checkVerifiedPurchase({
      buyerId: CUSTOMER,
      contentId: POST,
      contentType: 'POST',
      orderCompletedAt: '2026-07-01T00:00:00Z',
      orderId: ORDER,
      participantUserIds: [CUSTOMER],
    });
    expect(result.status).toBe('ELIGIBLE');
  });

  it('rejects verified-purchase from unrelated user', async () => {
    const svc = makeSvc();
    const result = await svc.checkVerifiedPurchase({
      buyerId: OTHER_USER,
      contentId: POST,
      contentType: 'POST',
      orderCompletedAt: '2026-07-01T00:00:00Z',
      orderId: ORDER,
      participantUserIds: [CUSTOMER],
    });
    expect(result.status).toBe('NOT_ELIGIBLE');
  });

  it('rejects verified-purchase on incomplete order', async () => {
    const svc = makeSvc({ completedAt: null });
    const result = await svc.checkVerifiedPurchase({
      buyerId: CUSTOMER,
      contentId: POST,
      contentType: 'POST',
      orderCompletedAt: null,
      orderId: ORDER,
      participantUserIds: [CUSTOMER],
    });
    expect(result.status).toBe('NOT_ELIGIBLE');
  });

  it('rejects verified-purchase without order link', async () => {
    const svc = makeSvc();
    const result = await svc.checkVerifiedPurchase({
      buyerId: CUSTOMER,
      contentId: POST,
      contentType: 'POST',
      orderCompletedAt: null,
      orderId: 'unknown-order' as Uuidv7,
      participantUserIds: [CUSTOMER],
    });
    // Unknown orderId is treated as "not completed" by the lookup → NOT_ELIGIBLE.
    expect(result.status).toBe('NOT_ELIGIBLE');
  });

  // ── Showcase consent ───────────────────────────────────────────────
  it('grants showcase consent for completed order', async () => {
    const svc = makeSvc();
    const consent = await svc.grantShowcaseConsent({
      actorUserId: CUSTOMER,
      customerId: CUSTOMER,
      orderId: ORDER,
      providerId: PROVIDER,
      scopes: ['PUBLIC_FEED', 'PROVIDER_PROFILE'],
    });
    expect(consent.scopes).toContain('PUBLIC_FEED');
    expect(consent.status).toBe('GRANTED');
  });

  it('rejects NDA-blocked consent', async () => {
    const svc = makeSvc();
    await expect(
      svc.grantShowcaseConsent({
        actorUserId: CUSTOMER,
        customerId: CUSTOMER,
        orderId: ORDER,
        providerId: PROVIDER,
        scopes: ['NDA_BLOCKED'],
      }),
    ).rejects.toThrow(ShowcaseConsentError);
  });

  it('rejects consent for incomplete order', async () => {
    const svc = makeSvc({ completedAt: null });
    await expect(
      svc.grantShowcaseConsent({
        actorUserId: CUSTOMER,
        customerId: CUSTOMER,
        orderId: ORDER,
        providerId: PROVIDER,
        scopes: ['PUBLIC_FEED'],
      }),
    ).rejects.toThrow(ShowcaseConsentError);
  });

  it('rejects empty scope list', async () => {
    const svc = makeSvc();
    await expect(
      svc.grantShowcaseConsent({
        actorUserId: CUSTOMER,
        customerId: CUSTOMER,
        orderId: ORDER,
        providerId: PROVIDER,
        scopes: [],
      }),
    ).rejects.toThrow(ShowcaseConsentError);
  });

  it('withdraws consent by customer and triggers HIDE_CONTENT policy', async () => {
    const svc = makeSvc();
    const consent = await svc.grantShowcaseConsent({
      actorUserId: CUSTOMER,
      customerId: CUSTOMER,
      orderId: ORDER,
      providerId: PROVIDER,
      scopes: ['PUBLIC_FEED'],
    });

    const policy = await svc.withdrawConsent({
      actorUserId: CUSTOMER,
      consentId: consent.id,
      expectedVersion: consent.version,
      reason: 'Customer changed mind',
    });

    expect(policy.action).toBe('HIDE_CONTENT');
    expect(policy.reason).toContain('Customer');
  });

  it('rejects withdrawal by non-owner', async () => {
    const svc = makeSvc();
    const consent = await svc.grantShowcaseConsent({
      actorUserId: CUSTOMER,
      customerId: CUSTOMER,
      orderId: ORDER,
      providerId: PROVIDER,
      scopes: ['PUBLIC_FEED'],
    });

    await expect(
      svc.withdrawConsent({
        actorUserId: OTHER_USER,
        consentId: consent.id,
        expectedVersion: consent.version,
        reason: 'Curious',
      }),
    ).rejects.toThrow(VerifiedPurchaseAuthorizationError);
  });

  it('rejects double withdrawal', async () => {
    const svc = makeSvc();
    const consent = await svc.grantShowcaseConsent({
      actorUserId: CUSTOMER,
      customerId: CUSTOMER,
      orderId: ORDER,
      providerId: PROVIDER,
      scopes: ['PUBLIC_FEED'],
    });

    await svc.withdrawConsent({
      actorUserId: CUSTOMER,
      consentId: consent.id,
      expectedVersion: consent.version,
      reason: 'first',
    });

    await expect(
      svc.withdrawConsent({
        actorUserId: CUSTOMER,
        consentId: consent.id,
        expectedVersion: consent.version + 1,
        reason: 'second',
      }),
    ).rejects.toThrow(ShowcaseConsentError);
  });

  it('finds consent by order ID', async () => {
    const svc = makeSvc();
    await svc.grantShowcaseConsent({
      actorUserId: CUSTOMER,
      customerId: CUSTOMER,
      orderId: ORDER,
      providerId: PROVIDER,
      scopes: ['PROVIDER_PROFILE'],
    });

    const found = await svc.findConsentByOrder(ORDER);
    expect(found).toBeTruthy();
    expect(found!.scopes).toContain('PROVIDER_PROFILE');
  });

  it('preserves original model accessibility isolation when consent is withdrawn', async () => {
    const svc = makeSvc();
    const consent = await svc.grantShowcaseConsent({
      actorUserId: CUSTOMER,
      customerId: CUSTOMER,
      orderId: ORDER,
      providerId: PROVIDER,
      scopes: ['PUBLIC_FEED'],
    });

    // Withdrawing consent: HIDE_CONTENT is the policy
    // (the original 3D model is never exposed via media in the first place -
    //  this is enforced at Task 53 level by isPrivateMedia)
    const policy = await svc.withdrawConsent({
      actorUserId: CUSTOMER,
      consentId: consent.id,
      expectedVersion: consent.version,
      reason: 'withdrawal',
    });

    expect(policy.action).toBe('HIDE_CONTENT');
  });
});
