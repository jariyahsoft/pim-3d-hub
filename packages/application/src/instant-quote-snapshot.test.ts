import { describe, it, expect } from 'vitest';
import {
  parseUtcTimestamp,
  type CalculatorResult,
  type CapacityReservationRecord,
  type CapacityReservationRepository,
  type CapacitySlotRepository,
  type InstantQuoteInputSnapshot,
  type InstantQuoteLineItem,
  type Uuidv7,
} from '@pim/domain';
// eslint-disable-next-line no-restricted-imports
import { createInMemoryInstantQuoteRepository } from '@pim/infrastructure';
import {
  createInstantQuoteSnapshotService,
  InstantQuoteCapacityUnavailableError,
  InstantQuoteExpiredError,
  InstantQuoteNotFoundError,
} from './instant-quote-snapshot.js';

// ── Test doubles ──────────────────────────────────────────────────────────

function stubCapacityHarness(): {
  capacitySlotRepository: Pick<CapacitySlotRepository, 'findSlotById'>;
  capacityReservationRepository: Pick<
    CapacityReservationRepository,
    'reserve' | 'releaseReservation'
  >;
} {
  const reservations = new Map<string, CapacityReservationRecord>();

  return {
    capacitySlotRepository: {
      async findSlotById(id: Uuidv7) {
        if (id === ('slot-finite' as Uuidv7)) {
          return {
            id,
            schemaVersion: 1,
            version: 1,
            createdAt: '2026-07-01T00:00:00Z',
            updatedAt: '2026-07-01T00:00:00Z',
            deletedAt: null,
            endsAt: '2026-12-31T23:59:59Z',
            printerId: '00000000-0000-7000-0000-000000000003' as Uuidv7,
            providerProfileId: '00000000-0000-7000-0000-000000000002' as Uuidv7,
            reservedUnits: 9,
            startsAt: '2026-07-01T00:00:00Z',
            status: 'OPEN',
            totalUnits: 10,
          };
        }
        return null;
      },
    },
    capacityReservationRepository: {
      async reserve(input: any) {
        const id = crypto.randomUUID() as Uuidv7;
        const rec = {
          id,
          schemaVersion: 1,
          version: 1,
          createdAt: '2026-07-01T00:00:00Z',
          updatedAt: '2026-07-01T00:00:00Z',
          deletedAt: null,
          expiresAt: input.expiresAt,
          idempotencyKey: input.idempotencyKey,
          printerId: input.printerId,
          providerProfileId: input.providerProfileId,
          providerServiceId: input.providerServiceId,
          releaseReason: null,
          releasedAt: null,
          requestHash: input.requestHash,
          reservedByUserId: input.reservedByUserId,
          slotId: input.slotId,
          status: 'ACTIVE',
          units: input.units,
        };
        reservations.set(id, rec);
        return rec;
      },
      async releaseReservation(input) {
        const existing = reservations.get(input.reservationId);
        if (existing) {
          reservations.delete(input.reservationId);
        }
        return existing ?? ({} as CapacityReservationRecord);
      },
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

const FAKE_BUYER = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const FAKE_PROVIDER = '00000000-0000-7000-0000-000000000002' as Uuidv7;
const FAKE_PRINTER = '00000000-0000-7000-0000-000000000003' as Uuidv7;
const FAKE_SERVICE = '00000000-0000-7000-0000-000000000004' as Uuidv7;
const FAKE_FILE = '00000000-0000-7000-0000-000000000005' as Uuidv7;
const FAKE_ANALYSIS = '00000000-0000-7000-0000-000000000006' as Uuidv7;
const FAKE_PROFILE = '00000000-0000-7000-0000-000000000007' as Uuidv7;

function makeSnapshot(): InstantQuoteInputSnapshot {
  return {
    colorCode: 'BLACK',
    hasSupport: true,
    isRush: false,
    materialCode: 'PLA',
    printerId: FAKE_PRINTER,
    providerServiceId: FAKE_SERVICE,
    qualityCode: 'STANDARD',
    quantity: 1,
  };
}

function makeCalculatorResult(): CalculatorResult {
  return {
    lineItems: [
      { code: 'MATERIAL', amountMinor: 17500 },
      { code: 'MACHINE', amountMinor: 2400 },
      { code: 'SETUP', amountMinor: 5000 },
    ],
    minimumOrderMinor: 10000,
    platformFeeMinor: 1750,
    shippingMinor: 5000,
    subtotalMinor: 24900,
    taxMinor: 1743,
    totalMinor: 26643,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────

describe('InstantQuoteSnapshot', () => {
  // ── Create snapshot ─────────────────────────────────────────────────

  it('creates a snapshot', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    const { created, quote } = await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2026-12-31T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-1',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    expect(created).toBe(true);
    expect(quote.status).toBe('ACTIVE');
    expect(quote.lineItems).toHaveLength(3);
    expect(quote.totalMinor).toBe(26643);
    expect(quote.expiresAt).toBe('2026-12-31T00:00:00Z');
  });

  it('is idempotent on duplicate creation', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    const cmd = {
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2026-12-31T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-2',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    };

    const r1 = await svc.createSnapshot(cmd);
    const r2 = await svc.createSnapshot(cmd);

    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    expect(r1.quote.id).toBe(r2.quote.id);
  });

  it('preserves input snapshot immutably', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    const snapshot = makeSnapshot();
    const { quote } = await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2026-12-31T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-snapshot',
      inputSnapshot: snapshot,
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    expect(quote.inputSnapshot.quantity).toBe(1);
    expect(quote.inputSnapshot.materialCode).toBe('PLA');
  });

  // ── Get by ID ────────────────────────────────────────────────────────

  it('returns quote by ID', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    const { quote } = await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2026-12-31T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-3',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    const fetched = await svc.getById(quote.id);
    expect(fetched.id).toBe(quote.id);
    expect(fetched.totalMinor).toBe(26643);
  });

  it('throws not-found for unknown ID', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    await expect(svc.getById('non-existent' as Uuidv7)).rejects.toThrow(
      InstantQuoteNotFoundError,
    );
  });

  // ── Reserve / Expire / Consume ──────────────────────────────────────

  it('expires an expired quote with runExpiryJob', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    // Create in past
    const { quote } = await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2026-01-01T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-past',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    expect(quote.status).toBe('ACTIVE');

    const expired = await svc.runExpiryJob(
      parseUtcTimestamp('2026-06-01T00:00:00Z'),
    );
    expect(expired).toHaveLength(1);
    expect(expired[0].status).toBe('EXPIRED');
  });

  it('does not expire a valid future quote', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2027-12-31T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-future',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    const expired = await svc.runExpiryJob(
      parseUtcTimestamp('2026-06-01T00:00:00Z'),
    );
    expect(expired).toHaveLength(0);
  });

  it('expires an active quote when explicitly called', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    const { quote } = await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2027-12-31T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-explicit-expire',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    const expired = await svc.expire({
      expectedVersion: quote.version,
      quoteId: quote.id,
    });
    expect(expired.status).toBe('EXPIRED');
  });

  it('consume is idempotent on second call', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    const { quote } = await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2027-12-31T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-consume',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    const consumed1 = await svc.consumeForOrder({
      expectedVersion: quote.version,
      orderId: 'order-1' as Uuidv7,
      quoteId: quote.id,
    });
    expect(consumed1.status).toBe('CONSUMED');
    expect(consumed1.consumedOrderId).toBe('order-1');

    // Second consume should fail
    await expect(
      svc.consumeForOrder({
        expectedVersion: consumed1.version,
        orderId: 'order-2' as Uuidv7,
        quoteId: quote.id,
      }),
    ).rejects.toThrow(InstantQuoteCapacityUnavailableError);
  });

  it('rejects consume of already-expired quote', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    const { quote } = await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2026-01-01T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-exp-consume',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    const expired = await svc.expire({
      expectedVersion: quote.version,
      quoteId: quote.id,
    });

    await expect(
      svc.consumeForOrder({
        expectedVersion: expired.version,
        orderId: 'order-1' as Uuidv7,
        quoteId: expired.id,
      }),
    ).rejects.toThrow();
  });

  it('rejects reserve of expired quote', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    const { quote } = await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2026-01-01T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-reserve-exp',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    const expired = await svc.expire({
      expectedVersion: quote.version,
      quoteId: quote.id,
    });

    await expect(
      svc.reserve({
        expectedVersion: expired.version,
        idempotencyKey: 'reserve-1',
        printerId: FAKE_PRINTER,
        providerProfileId: FAKE_PROVIDER,
        providerServiceId: FAKE_SERVICE,
        quoteId: expired.id,
        reservedByUserId: FAKE_BUYER,
        slotId: 'slot-1' as Uuidv7,
        units: 1,
      }),
    ).rejects.toThrow(InstantQuoteExpiredError);
  });

  // ── List ─────────────────────────────────────────────────────────────

  it('lists quotes with filter', async () => {
    const repo = createInMemoryInstantQuoteRepository();
    const stub = stubCapacityHarness();
    const svc = createInstantQuoteSnapshotService({
      instantQuoteRepository: repo,
      capacityReservationRepository: stub.capacityReservationRepository as any,
      capacitySlotRepository: stub.capacitySlotRepository as any,
    });

    await svc.createSnapshot({
      actorUserId: FAKE_BUYER,
      buyerId: FAKE_BUYER,
      calculatorResult: makeCalculatorResult(),
      expiresAt: '2027-12-31T00:00:00Z',
      fileAssetId: FAKE_FILE,
      idempotencyKey: 'idem-list-1',
      inputSnapshot: makeSnapshot(),
      modelAnalysisId: FAKE_ANALYSIS,
      pricingProfileId: FAKE_PROFILE,
      pricingProfileVersion: 1,
      providerId: FAKE_PROVIDER,
      reservationUnits: 1,
      sourceRuleSetVersion: 1,
    });

    const page = await svc.list({
      buyerId: FAKE_BUYER,
      limit: 10,
      status: 'ACTIVE',
    });
    expect(page.items.length).toBeGreaterThanOrEqual(1);
    expect(page.items[0].buyerId).toBe(FAKE_BUYER);
  });

  // ── Helper types ───────────────────────────────────────────────────

  it('line items have amountMinor and code', () => {
    const li: InstantQuoteLineItem = { code: 'MATERIAL', amountMinor: 17500 };
    expect(li.code).toBe('MATERIAL');
    expect(li.amountMinor).toBe(17500);
  });
});
