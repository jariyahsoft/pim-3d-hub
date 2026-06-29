import { describe, it, expect } from 'vitest';
import {
  checkEligibility,
  eligibilityReasonCodesV1,
  type AnalysisEligibilityHints,
  type CalculatorInput,
  type DimensionsMm,
  type EligibilityCheckInput,
  type EligibilityContext,
  type MeshHealth,
  type ModelAnalysisRecord,
  type PricingFormulaConfiguration,
  type PricingProfileRecord,
  type PricingProfileScope,
} from '@pim/domain';
import { calculatePrice } from '@pim/domain';

// ── Helpers ───────────────────────────────────────────────────────────────

type UuidV7 = string;

const FAKE_BUYER = '00000000-0000-7000-0000-000000000001' as UuidV7;
const FAKE_ASSET = '00000000-0000-7000-0000-000000000002' as UuidV7;
const FAKE_PRINTER = '00000000-0000-7000-0000-000000000003' as UuidV7;
const FAKE_SERVICE = '00000000-0000-7000-0000-000000000004' as UuidV7;

const DEFAULT_DIMENSIONS: DimensionsMm = {
  widthMm: 200 as unknown as number,
  heightMm: 150 as unknown as number,
  depthMm: 100 as unknown as number,
};

const DEFAULT_MESH: MeshHealth = {
  degenerateFacets: 0,
  edgesManifold: true,
  hasSolidOrientation: true,
  holes: 0,
  volumeClosed: true,
};

const DEFAULT_HINTS: AnalysisEligibilityHints = {
  materialSuggestion: 'PLA',
  maxAngleDeg: 45,
  minWallThicknessMm: 1.2,
  overhangPercentage: 10,
  printVolumeEligible: true,
  shellThicknessWarning: false,
  supportRequired: true,
};

function makeAnalysis(
  overrides?: Partial<ModelAnalysisRecord>,
): ModelAnalysisRecord {
  return {
    id: 'ana-001' as UuidV7,
    schemaVersion: 1,
    version: 1,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    deletedAt: null,
    createdBy: FAKE_BUYER,
    updatedBy: FAKE_BUYER,
    fileAssetId: FAKE_ASSET,
    assetId: FAKE_ASSET,
    analyzerVersion: 'stl-analyzer-v1',
    boundsMm: [50, 30, 20] as readonly [number, number, number],
    durationMs: 1200,
    eligibilityHints: DEFAULT_HINTS,
    endedAt: '2026-07-01T00:00:05Z',
    failureReason: null,
    meshHealth: DEFAULT_MESH,
    resourceProfile: { maxMemoryBytes: 67108864, maxTimeMs: 5000 },
    startedAt: '2026-07-01T00:00:00Z',
    status: 'COMPLETED',
    units: 'MM',
    volumeMm3: 30000,
    ...overrides,
  };
}

function makeInput(
  overrides?: Partial<EligibilityCheckInput>,
): EligibilityCheckInput {
  return {
    analysis: makeAnalysis(),
    buyerId: FAKE_BUYER,
    dueDate: '2026-07-20T00:00:00Z',
    fileAssetId: FAKE_ASSET,
    materialCode: 'PLA',
    quantity: 1,
    requestedColor: 'BLACK',
    requestedQuality: 'STANDARD',
    serviceType: 'PRINT_ONLY',
    ...overrides,
  };
}

function makeContext(
  overrides?: Partial<EligibilityContext>,
): EligibilityContext {
  return {
    printer: {
      buildVolumeMm: {
        widthMm: 200,
        heightMm: 200,
        depthMm: 200,
      } as DimensionsMm,
      id: FAKE_PRINTER,
      status: 'ACTIVE',
      technologyCode: 'FDM',
    },
    providerMaterial: {
      colorCode: 'BLACK',
      materialCode: 'PLA',
      stockStatus: 'IN_STOCK',
    },
    providerService: {
      instantOrderEnabled: true,
      leadTimeDays: 3,
      status: 'ACTIVE',
    },
    pricingProfile: {
      effectiveFrom: '2026-07-01T00:00:00Z',
      id: 'prof-001' as UuidV7,
      status: 'ACTIVE',
    },
    supportedQuality: true,
    ...overrides,
  };
}

function makeProfile(
  overrides?: Partial<PricingProfileRecord>,
): PricingProfileRecord {
  const formula: PricingFormulaConfiguration = {
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
  };
  const scope: PricingProfileScope = {
    materialCode: 'PLA',
    printerId: FAKE_PRINTER,
    serviceId: FAKE_SERVICE,
  };
  return {
    id: 'prof-001' as UuidV7,
    schemaVersion: 1,
    version: 3,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    deletedAt: null,
    createdBy: FAKE_BUYER,
    updatedBy: FAKE_BUYER,
    name: 'Standard PLA',
    providerProfileId: 'prov-001' as UuidV7,
    scope,
    currency: 'THB' as const,
    effectiveFrom: '2026-07-01T00:00:00Z',
    formula,
    status: 'ACTIVE',
    versionNo: 1,
    ...overrides,
  };
}

// ── Eligibility Tests ─────────────────────────────────────────────────────

describe('InstantQuoteEligibility', () => {
  // ── Happy path ──────────────────────────────────────────────────────

  it('returns eligible for valid input', () => {
    const result = checkEligibility(makeInput(), makeContext());
    expect(result.eligible).toBe(true);
    expect(result.reasonCodes).toHaveLength(0);
    expect(result.schemaVersion).toBe(1);
  });

  // ── Analysis checks ─────────────────────────────────────────────────

  it('rejects when analysis is missing', () => {
    const input = makeInput({ analysis: null });
    const result = checkEligibility(input, makeContext());
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('ANALYSIS_MISSING');
  });

  it('rejects when analysis has failed status', () => {
    const input = makeInput({ analysis: makeAnalysis({ status: 'FAILED' }) });
    const result = checkEligibility(input, makeContext());
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('ANALYSIS_FAILED');
  });

  it('rejects when analysis has untrusted version', () => {
    const input = makeInput({
      analysis: makeAnalysis({ analyzerVersion: '' }),
    });
    const result = checkEligibility(input, makeContext());
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('ANALYSIS_UNTRUSTED_VERSION');
    expect(result.reasonCodes).toContain('MANUAL_REVIEW_REQUIRED');
  });

  it('rejects when analysis units are unknown', () => {
    const input = makeInput({ analysis: makeAnalysis({ units: 'UNKNOWN' }) });
    const result = checkEligibility(input, makeContext());
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('UNIT_AMBIGUITY');
    expect(result.reasonCodes).toContain('MANUAL_REVIEW_REQUIRED');
  });

  // ── Build volume checks ─────────────────────────────────────────────

  it('rejects when model exceeds build volume', () => {
    const ctx = makeContext({
      printer: {
        buildVolumeMm: {
          widthMm: 30,
          heightMm: 30,
          depthMm: 30,
        } as DimensionsMm,
        id: FAKE_PRINTER,
        status: 'ACTIVE',
        technologyCode: 'FDM',
      },
    });
    const input = makeInput({
      analysis: makeAnalysis({ boundsMm: [50, 30, 20] }),
    });
    const result = checkEligibility(input, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('BUILD_VOLUME_EXCEEDED');
  });

  it('rejects when model bounds are zero', () => {
    const input = makeInput({
      analysis: makeAnalysis({ boundsMm: [0, 0, 0] }),
    });
    const result = checkEligibility(input, makeContext());
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('BUILD_VOLUME_UNKNOWN');
  });

  // ── Printer / service checks ───────────────────────────────────────────

  it('rejects when printer is not found', () => {
    const ctx = makeContext({ printer: null });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('PRINTER_NOT_FOUND');
  });

  it('rejects when printer is inactive', () => {
    const ctx = makeContext({
      printer: {
        buildVolumeMm: DEFAULT_DIMENSIONS,
        id: FAKE_PRINTER,
        status: 'DISABLED',
        technologyCode: 'FDM',
      },
    });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('PRINTER_INACTIVE');
  });

  it('rejects when service is not found', () => {
    const ctx = makeContext({ providerService: null });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('SERVICE_NOT_FOUND');
  });

  it('rejects when service is inactive', () => {
    const ctx = makeContext({
      providerService: {
        instantOrderEnabled: true,
        leadTimeDays: 3,
        status: 'PAUSED',
      },
    });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('SERVICE_INACTIVE');
  });

  // ── Material / color / quality ─────────────────────────────────────

  it('rejects when material is not found', () => {
    const ctx = makeContext({ providerMaterial: null });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('MATERIAL_NOT_SUPPORTED');
  });

  it('rejects when material is out of stock', () => {
    const ctx = makeContext({
      providerMaterial: {
        colorCode: 'BLACK',
        materialCode: 'PLA',
        stockStatus: 'OUT_OF_STOCK',
      },
    });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('MATERIAL_OUT_OF_STOCK');
  });

  it('rejects when color is not supported', () => {
    const ctx = makeContext({
      providerMaterial: {
        colorCode: 'RED',
        materialCode: 'PLA',
        stockStatus: 'IN_STOCK',
      },
    });
    const input = makeInput({ requestedColor: 'BLACK' });
    const result = checkEligibility(input, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('COLOR_NOT_SUPPORTED');
  });

  it('rejects when quality is not supported', () => {
    const ctx = makeContext({ supportedQuality: false });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('QUALITY_NOT_SUPPORTED');
  });

  // ── Pricing profile checks ─────────────────────────────────────────

  it('rejects when pricing profile is missing', () => {
    const ctx = makeContext({ pricingProfile: null });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('PRICING_PROFILE_MISSING');
  });

  it('rejects when pricing profile is inactive', () => {
    const ctx = makeContext({
      pricingProfile: {
        effectiveFrom: '2026-07-01T00:00:00Z',
        id: 'prof-001' as UuidV7,
        status: 'RETIRED',
      },
    });
    const result = checkEligibility(makeInput(), ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('PRICING_PROFILE_INACTIVE');
  });

  // ── Quantity check ─────────────────────────────────────────────────

  it('rejects zero quantity', () => {
    const input = makeInput({ quantity: 0 });
    const result = checkEligibility(input, makeContext());
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('QUANTITY_EXCEEDS_CAPACITY');
  });

  // ── Due date check ─────────────────────────────────────────────────

  it('rejects due date that is too early', () => {
    const input = makeInput({
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    const result = checkEligibility(input, makeContext());
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('DUE_DATE_TOO_EARLY');
  });

  it('allows due date far enough in future', () => {
    const input = makeInput({
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    const result = checkEligibility(input, makeContext());
    // Should not have DUE_DATE_TOO_EARLY
    expect(result.reasonCodes).not.toContain('DUE_DATE_TOO_EARLY');
  });

  it('allows null due date', () => {
    const input = makeInput({ dueDate: null });
    const result = checkEligibility(input, makeContext());
    expect(result.reasonCodes).not.toContain('DUE_DATE_TOO_EARLY');
  });

  // ── Manual / special checks ─────────────────────────────────────────

  it('rejects when analysis hints indicate manual review required', () => {
    const input = makeInput({
      analysis: makeAnalysis({
        eligibilityHints: { ...DEFAULT_HINTS, printVolumeEligible: false },
      }),
    });
    const result = checkEligibility(input, makeContext());
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('MANUAL_REVIEW_REQUIRED');
  });

  // ── Multiple reasons ───────────────────────────────────────────────

  it('returns multiple reasons when multiple checks fail', () => {
    const ctx = makeContext({
      printer: null,
      providerMaterial: null,
      providerService: null,
      pricingProfile: null,
    });
    const input = makeInput({
      analysis: makeAnalysis({ status: 'FAILED' }),
      quantity: 0,
    });
    const result = checkEligibility(input, ctx);
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes.length).toBeGreaterThanOrEqual(4);
    expect(result.reasonCodes).toContain('ANALYSIS_FAILED');
    expect(result.reasonCodes).toContain('PRINTER_NOT_FOUND');
    expect(result.reasonCodes).toContain('MATERIAL_NOT_SUPPORTED');
    expect(result.reasonCodes).toContain('QUANTITY_EXCEEDS_CAPACITY');
  });

  // ── Deterministic ──────────────────────────────────────────────────

  it('produces same result for same input (deterministic)', () => {
    const input = makeInput();
    const ctx = makeContext();
    const r1 = checkEligibility(input, ctx);
    const r2 = checkEligibility(input, ctx);
    const r3 = checkEligibility(input, ctx);
    expect(r1).toEqual(r2);
    expect(r2).toEqual(r3);
  });

  // ── Schema version ─────────────────────────────────────────────────

  it('returns schema version 1', () => {
    const result = checkEligibility(makeInput(), makeContext());
    expect(result.schemaVersion).toBe(1);
  });

  it('has a defined set of reason codes', () => {
    expect(eligibilityReasonCodesV1.length).toBeGreaterThan(0);
    expect(eligibilityReasonCodesV1).toContain('ANALYSIS_MISSING');
    expect(eligibilityReasonCodesV1).toContain('MANUAL_REVIEW_REQUIRED');
    expect(eligibilityReasonCodesV1).toContain('CAPACITY_UNAVAILABLE');
  });
});

// ── Pricing Engine Tests ──────────────────────────────────────────────────

describe('InstantQuotePricing', () => {
  it('calculates price from active profile', () => {
    const profile = makeProfile();
    const input: CalculatorInput = {
      estimatedMinutes: 60,
      hasSupport: true,
      isRush: false,
      materialCode: 'PLA',
      qualityCode: 'STANDARD',
      quantity: 1,
      volumeGrams: 50,
    };

    const result = calculatePrice(profile, input);

    // Verify core calculations
    expect(result.lineItems.length).toBeGreaterThan(0);
    const material = result.lineItems.find((l) => l.code === 'MATERIAL');
    expect(material?.amountMinor).toBe(17500); // 350 * 50

    const machine = result.lineItems.find((l) => l.code === 'MACHINE');
    expect(machine?.amountMinor).toBe(2400); // 40 * 60

    expect(result.totalMinor).toBeGreaterThan(0);
  });

  it('rejects inactive profile via eligibility check', () => {
    const result = checkEligibility(
      makeInput(),
      makeContext({
        pricingProfile: {
          effectiveFrom: '2026-07-01T00:00:00Z',
          id: 'prof-001' as UuidV7,
          status: 'RETIRED',
        },
      }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reasonCodes).toContain('PRICING_PROFILE_INACTIVE');
  });

  it('preserves deterministic pricing across calls', () => {
    const profile = makeProfile();
    const input: CalculatorInput = {
      estimatedMinutes: 90,
      hasSupport: false,
      isRush: true,
      materialCode: 'PLA',
      qualityCode: 'DRAFT',
      quantity: 3,
      volumeGrams: 75,
    };

    const r1 = calculatePrice(profile, input);
    const r2 = calculatePrice(profile, input);
    expect(r1.totalMinor).toBe(r2.totalMinor);
    expect(r1.lineItems).toEqual(r2.lineItems);
  });

  it('produces different results for different profiles', () => {
    const profileA = makeProfile({
      formula: { ...makeProfile().formula, materialRateMinorPerGram: 350 },
    });
    const profileB = makeProfile({
      formula: { ...makeProfile().formula, materialRateMinorPerGram: 999 },
    });
    const input: CalculatorInput = {
      estimatedMinutes: 60,
      hasSupport: true,
      isRush: false,
      materialCode: 'PLA',
      qualityCode: 'STANDARD',
      quantity: 1,
      volumeGrams: 100,
    };

    const resultA = calculatePrice(profileA, input);
    const resultB = calculatePrice(profileB, input);
    expect(resultA.totalMinor).not.toBe(resultB.totalMinor);
  });
});
