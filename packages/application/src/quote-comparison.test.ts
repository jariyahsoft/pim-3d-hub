import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import { createInMemoryInstantQuoteRepository } from '@pim/infrastructure';
import {
  createQuoteComparisonService,
  QuoteAlreadyConsumedError,
  QuoteExpiredForCheckoutError,
  QuoteNotSelectedError,
} from './quote-comparison.js';
import type { Uuidv7 } from '@pim/domain';

const FAKE_BUYER = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const FAKE_PROVIDER = '00000000-0000-7000-0000-000000000002' as Uuidv7;
const FAKE_FILE = '00000000-0000-7000-0000-000000000005' as Uuidv7;

function makeProviderNameLookup() {
  return {
    async lookupProviderName(providerId: Uuidv7): Promise<string> {
      if (providerId === FAKE_PROVIDER) return 'Test Provider';
      return 'Unknown';
    },
  };
}

async function seed(
  repo: ReturnType<typeof createInMemoryInstantQuoteRepository>,
) {
  await repo.createIfNotExists(
    {
      buyerId: FAKE_BUYER,
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      fileAssetId: FAKE_FILE,
      inputSnapshot: {
        colorCode: 'BLACK',
        hasSupport: true,
        isRush: false,
        materialCode: 'PLA',
        printerId: '00000000-0000-7000-0000-000000000003' as Uuidv7,
        providerServiceId: '00000000-0000-7000-0000-000000000004' as Uuidv7,
        qualityCode: 'STANDARD',
        quantity: 1,
      },
      lineItems: [
        { code: 'MATERIAL', amountMinor: 10000 },
        { code: 'SETUP', amountMinor: 5000 },
      ],
      modelAnalysisId: '00000000-0000-7000-0000-000000000020' as Uuidv7,
      pricingProfileId: '00000000-0000-7000-0000-000000000021' as Uuidv7,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
      subtotalMinor: 15000,
      totalMinor: 15000,
    },
    'idem-1',
  );
}

describe('QuoteComparisonService', () => {
  it('gathers quotes for a buyer', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    await seed(repo);
    const svc = createQuoteComparisonService({
      instantQuoteRepository: repo,
      providerNameLookupPort: makeProviderNameLookup(),
    });

    const page = await svc.gatherQuotes({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      fileAssetId: FAKE_FILE,
      limit: 10,
    });

    expect(page.items.length).toBeGreaterThanOrEqual(1);
    expect(page.items[0].providerName).toBe('Test Provider');
    expect(page.items[0].totalMinor).toBe(15000);
  });

  it('initiates checkout for active quote', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    await seed(repo);
    const svc = createQuoteComparisonService({
      instantQuoteRepository: repo,
      providerNameLookupPort: makeProviderNameLookup(),
    });

    const page = await svc.gatherQuotes({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      fileAssetId: FAKE_FILE,
      limit: 10,
    });

    const quote = page.items[0];
    const result = await svc.initiateCheckout({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      idempotencyKey: 'checkout-1',
      quoteId: quote.id,
    });

    expect(result.quoteId).toBe(quote.id);
    expect(result.totalMinor).toBe(15000);
    expect(result.redirectPath).toContain('/checkout/');
  });

  it('rejects checkout on consumed quote', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    await seed(repo);
    const svc = createQuoteComparisonService({
      instantQuoteRepository: repo,
      providerNameLookupPort: makeProviderNameLookup(),
    });

    const page = await svc.gatherQuotes({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      fileAssetId: FAKE_FILE,
      limit: 10,
    });

    const quote = page.items[0];
    // Manually mark as consumed
    await repo.markConsumed(
      quote.id,
      '00000000-0000-7000-0000-000000000099' as Uuidv7,
      1,
    );

    await expect(
      svc.initiateCheckout({
        actorUserId: FAKE_BUYER,
        buyerId: FAKE_BUYER,
        idempotencyKey: 'checkout-1',
        quoteId: quote.id,
      }),
    ).rejects.toThrow(QuoteAlreadyConsumedError);
  });

  it('rejects checkout on expired quote', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    await seed(repo);
    const svc = createQuoteComparisonService({
      instantQuoteRepository: repo,
      providerNameLookupPort: makeProviderNameLookup(),
    });

    const page = await svc.gatherQuotes({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      fileAssetId: FAKE_FILE,
      limit: 10,
    });

    const quote = page.items[0];
    await repo.markExpired(quote.id, 1);

    await expect(
      svc.initiateCheckout({
        actorUserId: FAKE_BUYER,
        buyerId: FAKE_BUYER,
        idempotencyKey: 'checkout-1',
        quoteId: quote.id,
      }),
    ).rejects.toThrow(QuoteExpiredForCheckoutError);
  });

  it('rejects checkout when quote does not belong to the buyer', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    await seed(repo);
    const svc = createQuoteComparisonService({
      instantQuoteRepository: repo,
      providerNameLookupPort: makeProviderNameLookup(),
    });

    const page = await svc.gatherQuotes({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      fileAssetId: FAKE_FILE,
      limit: 10,
    });

    const quote = page.items[0];
    await expect(
      svc.initiateCheckout({
        actorUserId: '00000000-0000-7000-0000-000000000099' as Uuidv7,
        buyerId: '00000000-0000-7000-0000-000000000099' as Uuidv7,
        idempotencyKey: 'checkout-1',
        quoteId: quote.id,
      }),
    ).rejects.toThrow(QuoteNotSelectedError);
  });

  it('prepares manual fallback preserving file reference', () => {
    const repo = createInMemoryInstantQuoteRepository();
    const svc = createQuoteComparisonService({
      instantQuoteRepository: repo,
      providerNameLookupPort: makeProviderNameLookup(),
    });

    const draft = svc.prepareManualFallback({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      budgetMinor: 50000,
      deliveryAddress: '123 Bangkok',
      dueAt: '2026-08-01T00:00:00Z',
      fileAssetId: FAKE_FILE,
      materialCode: 'PLA',
      pickupOnly: false,
      qualityCode: 'STANDARD',
      quantity: 2,
      requirements: 'Make it sturdy',
    });

    expect(draft.fileAssetId).toBe(FAKE_FILE);
    expect(draft.quantity).toBe(2);
    expect(draft.budgetMinor).toBe(50000);
    expect(draft.serviceRequestDraftPath).toContain(FAKE_FILE);
  });

  it('manual fallback supports no address when pickup only', () => {
    const repo = createInMemoryInstantQuoteRepository();
    const svc = createQuoteComparisonService({
      instantQuoteRepository: repo,
      providerNameLookupPort: makeProviderNameLookup(),
    });

    const draft = svc.prepareManualFallback({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      budgetMinor: null,
      deliveryAddress: '',
      dueAt: '',
      fileAssetId: FAKE_FILE,
      materialCode: 'PLA',
      pickupOnly: true,
      qualityCode: 'STANDARD',
      quantity: 1,
      requirements: '',
    });

    expect(draft.pickupOnly).toBe(true);
    expect(draft.deliveryAddress).toBe('');
    expect(draft.budgetMinor).toBeNull();
  });
});
