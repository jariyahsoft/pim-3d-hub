import { describe, it, expect } from 'vitest';
import {
  calculatePrice,
  applyBps,
  type CalculatorInput,
  type PricingFormulaConfiguration,
  type PricingProfileRecord,
  type PricingProfileScope,
} from '@pim/domain';
// eslint-disable-next-line no-restricted-imports
import { createInMemoryPricingProfileRepository } from '@pim/infrastructure';
import {
  createPricingProfileService,
  PricingProfileNotFoundError,
  PricingProfileStateError,
} from '@pim/application';
import type { Uuidv7 } from '@pim/domain';

// ── Helpers ───────────────────────────────────────────────────────────────

const FAKE_PROVIDER_ID = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const FAKE_SERVICE_ID = '00000000-0000-7000-0000-000000000002' as Uuidv7;
const FAKE_PRINTER_ID = '00000000-0000-7000-0000-000000000003' as Uuidv7;
const FAKE_USER_ID = '00000000-0000-7000-0000-000000000004' as Uuidv7;

function makeScope(
  overrides?: Partial<PricingProfileScope>,
): PricingProfileScope {
  return {
    materialCode: 'PLA',
    printerId: FAKE_PRINTER_ID,
    serviceId: FAKE_SERVICE_ID,
    ...overrides,
  };
}

function makeFormula(
  overrides?: Partial<PricingFormulaConfiguration>,
): PricingFormulaConfiguration {
  return {
    minimumOrderMinor: 10000,
    materialRateMinorPerGram: 350,
    machineRateMinorPerMinute: 40,
    setupFeeMinor: 5000,
    supportMultiplierBps: 1200,
    riskBufferBps: 800,
    rushMultiplierBps: 15000,
    quantityDiscountBps: 500,
    platformFeeBps: 500,
    laborMultiplierBps: 300,
    shippingMinor: 5000,
    taxRateBps: 700,
    ...overrides,
  };
}

function makeInput(overrides?: Partial<CalculatorInput>): CalculatorInput {
  return {
    estimatedMinutes: 60,
    hasSupport: true,
    isRush: false,
    materialCode: 'PLA',
    qualityCode: 'STANDARD',
    quantity: 1,
    volumeGrams: 50,
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────

describe('PricingProfileService', () => {
  // ── Create draft ────────────────────────────────────────────────────

  it('creates a draft profile', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    const dto = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'Standard PLA Profile',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });

    expect(dto.name).toBe('Standard PLA Profile');
    expect(dto.status).toBe('DRAFT');
    expect(dto.versionNo).toBe(0);
    expect(dto.id).toBeTruthy();
  });

  // ── Update draft ────────────────────────────────────────────────────

  it('updates a draft profile', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'Initial Draft',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });

    const updated = await svc.updateDraft({
      actorUserId: FAKE_USER_ID,
      expectedVersion: draft.version,
      profileId: draft.id,
      updates: { name: 'Updated Name' },
    });

    expect(updated.name).toBe('Updated Name');
    expect(updated.version).toBe(draft.version + 1);
  });

  it('rejects update of non-draft profile', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'Draft',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });

    await svc.publish({
      actorUserId: FAKE_USER_ID,
      expectedVersion: draft.version,
      profileId: draft.id,
    });

    await expect(
      svc.updateDraft({
        actorUserId: FAKE_USER_ID,
        expectedVersion: draft.version + 1,
        profileId: draft.id,
        updates: { name: 'Should Fail' },
      }),
    ).rejects.toThrow(PricingProfileStateError);
  });

  // ── Publish ─────────────────────────────────────────────────────────

  it('publishes a draft profile', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'My Profile',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });

    const active = await svc.publish({
      actorUserId: FAKE_USER_ID,
      expectedVersion: draft.version,
      profileId: draft.id,
    });

    expect(active.status).toBe('ACTIVE');
    expect(active.versionNo).toBe(1);
  });

  it('retires old profile when publishing a new one for the same scope', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    // Create and publish v1
    const v1draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'v1',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });
    const v1 = await svc.publish({
      actorUserId: FAKE_USER_ID,
      expectedVersion: v1draft.version,
      profileId: v1draft.id,
    });
    expect(v1.versionNo).toBe(1);
    expect(v1.status).toBe('ACTIVE');

    // Create and publish v2
    const v2draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-15T00:00:00Z',
      formula: makeFormula({ materialRateMinorPerGram: 400 }),
      name: 'v2',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });
    const v2 = await svc.publish({
      actorUserId: FAKE_USER_ID,
      expectedVersion: v2draft.version,
      profileId: v2draft.id,
    });
    expect(v2.versionNo).toBe(2);
    expect(v2.status).toBe('ACTIVE');

    // v1 should now be RETIRED
    const retired = await svc.getById(v1.id);
    expect(retired.status).toBe('RETIRED');
  });

  it('rejects publish of already-published profile', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'Draft',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });

    await svc.publish({
      actorUserId: FAKE_USER_ID,
      expectedVersion: draft.version,
      profileId: draft.id,
    });

    await expect(
      svc.publish({
        actorUserId: FAKE_USER_ID,
        expectedVersion: draft.version + 1,
        profileId: draft.id,
      }),
    ).rejects.toThrow(PricingProfileStateError);
  });

  // ── Get by ID ───────────────────────────────────────────────────────

  it('returns a profile by ID', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'Test',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });

    const found = await svc.getById(draft.id);
    expect(found.id).toBe(draft.id);
    expect(found.name).toBe('Test');
  });

  it('throws when profile not found', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    await expect(svc.getById('nonexistent' as Uuidv7)).rejects.toThrow(
      PricingProfileNotFoundError,
    );
  });
});

// ── Calculator Tests ────────────────────────────────────────────────────

describe('PricingCalculator', () => {
  function makeProfile(
    formulaOverrides?: Partial<PricingFormulaConfiguration>,
  ): PricingProfileRecord {
    return {
      id: 'profile-1' as Uuidv7,
      schemaVersion: 1,
      version: 1,
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z',
      deletedAt: null,
      createdBy: FAKE_USER_ID,
      updatedBy: FAKE_USER_ID,
      name: 'Test Profile',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
      currency: 'THB' as const,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(formulaOverrides),
      status: 'ACTIVE',
      versionNo: 1,
    };
  }

  it('computes line items correctly for standard input', () => {
    const profile = makeProfile();
    const input = makeInput();
    const result = calculatePrice(profile, input);

    // MATERIAL = 350 * 50 * 1 = 17_500
    expect(
      result.lineItems.find((l) => l.code === 'MATERIAL')?.amountMinor,
    ).toBe(17500);
    // MACHINE = 40 * 60 * 1 = 2_400
    expect(
      result.lineItems.find((l) => l.code === 'MACHINE')?.amountMinor,
    ).toBe(2400);
    // SETUP = 5_000 * 1 = 5_000
    expect(result.lineItems.find((l) => l.code === 'SETUP')?.amountMinor).toBe(
      5000,
    );
    // SUPPORT = round(17_500 * 1200 / 10000) = round(2100) = 2100
    expect(
      result.lineItems.find((l) => l.code === 'SUPPORT')?.amountMinor,
    ).toBe(2100);
    // LABOR = round(17_500 * 300 / 10000) = round(525) = 525
    expect(result.lineItems.find((l) => l.code === 'LABOR')?.amountMinor).toBe(
      525,
    );
    // Base subtotal = 17_500 + 2_400 + 5_000 + 2_100 + 525 = 27_525
    // RISK = round(27_525 * 800 / 10000) = round(2202) = 2202
    expect(result.lineItems.find((l) => l.code === 'RISK')?.amountMinor).toBe(
      2202,
    );
    // After risk: 27_525 + 2_202 = 29_727
    // No rush
    // Qty discount = 0 (qty=1)
    // SHIPPING = 5_000
    // After shipping: 34_727
    // Platform fee = round(34_727 * 500 / 10000) = round(1736.35) = 1736
    expect(
      result.lineItems.find((l) => l.code === 'PLATFORM_FEE')?.amountMinor,
    ).toBe(1736);
    // After fee: 36_463
    // Tax = round(36_463 * 700 / 10000) = round(2552.41) = 2552
    expect(result.lineItems.find((l) => l.code === 'TAX')?.amountMinor).toBe(
      2552,
    );
    // Total = 36_463 + 2_552 = 39_015
    // Min order check: 39_015 >= 10_000 → 39_015
    expect(result.totalMinor).toBe(39015);
  });

  it('applies minimum order when total is below minimum', () => {
    const profile = makeProfile({
      minimumOrderMinor: 100_000, // very high minimum
    });
    const input = makeInput();
    const result = calculatePrice(profile, input);
    expect(result.totalMinor).toBe(100_000);
  });

  it('applies rush multiplier', () => {
    const profile = makeProfile();
    const normalResult = calculatePrice(profile, makeInput({ isRush: false }));
    const rushResult = calculatePrice(profile, makeInput({ isRush: true }));

    // Rush multiplier: 15_000 bps = 150% applied to post-risk subtotal
    expect(rushResult.totalMinor).toBeGreaterThan(normalResult.totalMinor);
    expect(
      rushResult.lineItems.find((l) => l.code === 'RUSH')?.amountMinor,
    ).toBeGreaterThan(0);
  });

  it('applies quantity discount for multiple items', () => {
    const profile = makeProfile();
    const singleResult = calculatePrice(profile, makeInput({ quantity: 1 }));
    const multiResult = calculatePrice(profile, makeInput({ quantity: 10 }));

    // Multi should have a negative QUANTITY_DISCOUNT line item
    const discount = multiResult.lineItems.find(
      (l) => l.code === 'QUANTITY_DISCOUNT',
    );
    expect(discount).toBeDefined();
    expect(discount!.amountMinor).toBeLessThan(0);

    // Total for 10 should be less than 10× single (due to quantity discount)
    expect(multiResult.totalMinor).toBeLessThan(singleResult.totalMinor * 10);
  });

  it('does not charge support when hasSupport is false', () => {
    const profile = makeProfile();
    const result = calculatePrice(profile, makeInput({ hasSupport: false }));
    expect(result.lineItems.find((l) => l.code === 'SUPPORT')).toBeUndefined();
  });

  it('produces same result for same input (deterministic)', () => {
    const profile = makeProfile();
    const input = makeInput();

    const result1 = calculatePrice(profile, input);
    const result2 = calculatePrice(profile, input);
    const result3 = calculatePrice(profile, input);

    expect(result1.totalMinor).toBe(result2.totalMinor);
    expect(result2.totalMinor).toBe(result3.totalMinor);
    expect(result1.lineItems).toEqual(result2.lineItems);
  });

  it('handles large quantity without overflow', () => {
    const profile = makeProfile();
    const input = makeInput({
      quantity: 10_000,
      volumeGrams: 100,
      estimatedMinutes: 120,
    });

    const result = calculatePrice(profile, input);
    expect(result.totalMinor).toBeGreaterThan(0);
    expect(Number.isSafeInteger(result.totalMinor)).toBe(true);
  });

  it('handles zero volume gracefully', () => {
    // Use a high minimum order so total is below it
    const profile = makeProfile({ minimumOrderMinor: 200_000 });
    const input = makeInput({ volumeGrams: 0, estimatedMinutes: 0 });

    const result = calculatePrice(profile, input);
    // Minimum order should apply
    expect(result.totalMinor).toBe(200_000);
  });

  it('includes all expected line items for rush multi-quantity order', () => {
    const profile = makeProfile();
    const result = calculatePrice(
      profile,
      makeInput({
        isRush: true,
        quantity: 5,
        hasSupport: true,
      }),
    );

    const codes = result.lineItems.map((l) => l.code);
    expect(codes).toContain('MATERIAL');
    expect(codes).toContain('MACHINE');
    expect(codes).toContain('SETUP');
    expect(codes).toContain('SUPPORT');
    expect(codes).toContain('LABOR');
    expect(codes).toContain('RISK');
    expect(codes).toContain('RUSH');
    expect(codes).toContain('QUANTITY_DISCOUNT');
    expect(codes).toContain('SHIPPING');
    expect(codes).toContain('PLATFORM_FEE');
    expect(codes).toContain('TAX');
  });

  it('rounds each line item independently (round-half-up)', () => {
    // Test that bps rounding is correct
    expect(applyBps(100, 500)).toBe(5); // 100 * 500 / 10000 = 5
    expect(applyBps(100, 550)).toBe(6); // 100 * 550 / 10000 = 5.5 → round to 6
    expect(applyBps(100, 549)).toBe(5); // 100 * 549 / 10000 = 5.49 → round to 5
    expect(applyBps(1, 5000)).toBe(1); // 1 * 5000 / 10000 = 0.5 → round to 1
    expect(applyBps(1, 4999)).toBe(0); // 1 * 4999 / 10000 = 0.4999 → round to 0
  });

  it('publishing never changes old quote calculation', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });
    const input = makeInput();

    // Create and publish v1
    const v1draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'v1',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });
    await svc.publish({
      actorUserId: FAKE_USER_ID,
      expectedVersion: v1draft.version,
      profileId: v1draft.id,
    });

    // Calculate with v1
    const v1Result = await svc.calculatePrice({ input, profileId: v1draft.id });

    // Create and publish v2 (different rates)
    const v2draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-15T00:00:00Z',
      formula: makeFormula({ materialRateMinorPerGram: 999 }),
      name: 'v2',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });
    await svc.publish({
      actorUserId: FAKE_USER_ID,
      expectedVersion: v2draft.version,
      profileId: v2draft.id,
    });

    // v1 result should be unchanged
    const v1Again = await svc.calculatePrice({ input, profileId: v1draft.id });
    expect(v1Again.totalMinor).toBe(v1Result.totalMinor);
    expect(v1Again.lineItems).toEqual(v1Result.lineItems);
  });

  it('profile is not found via getById after soft delete', async () => {
    const repo = createInMemoryPricingProfileRepository();
    const svc = createPricingProfileService({ pricingProfileRepository: repo });

    const draft = await svc.createDraft({
      actorUserId: FAKE_USER_ID,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: makeFormula(),
      name: 'Delete Me',
      providerProfileId: FAKE_PROVIDER_ID,
      scope: makeScope(),
    });

    await repo.softDelete(draft.id, draft.version);

    await expect(svc.getById(draft.id)).rejects.toThrow(
      PricingProfileNotFoundError,
    );
  });
});
