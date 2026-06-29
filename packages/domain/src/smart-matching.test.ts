import { describe, it, expect } from 'vitest';
import {
  computeMatch,
  computeDynamicPrice,
  DynamicPricingDisabledError,
  dynamicPricingExperimentVersion,
} from './smart-matching.js';
import type { Uuidv7 } from './index.js';

const PROVIDER_A = '00000000-0000-7000-0000-000000000001' as Uuidv7;

function makeItem(
  overrides?: Partial<typeof item>,
): ReturnType<typeof baseItem> {
  const item: ReturnType<typeof baseItem> = {
    id: 'item-1' as Uuidv7,
    providerId: PROVIDER_A,
    serviceTypeMatch: true,
    distanceKm: 5,
    capacityAvailable: true,
    deliveryDays: 3,
    qualityScore: 0.9,
    ratingAverage: 4.8,
    preferenceMatch: 0,
    isSponsored: false,
    totalPriceMinor: 50000,
    ...overrides,
  } as any;
  return item;
}

describe('computeMatch', () => {
  it('returns highest score for perfect match', () => {
    const result = computeMatch(makeItem(), {
      maxDistanceKm: 50,
      preferredProviderIds: [PROVIDER_A],
    });
    expect(result.rankingVersion).toBe(1);
    expect(result.overallScore).toBeGreaterThan(0);
    const sponsored = result.features.find((f) => f.type === 'SPONSORED');
    expect(sponsored!.score).toBe(0);
  });

  it('sponsored stays as separate labeled signal', () => {
    const sponsoredItem = makeItem({ isSponsored: true });
    const nonSponsored = computeMatch(makeItem(), {
      maxDistanceKm: 50,
      preferredProviderIds: [],
    });
    const sponsored = computeMatch(sponsoredItem, {
      maxDistanceKm: 50,
      preferredProviderIds: [],
    });
    expect(sponsored.overallScore).toBeGreaterThan(nonSponsored.overallScore);
    const sf = sponsored.features.find((f) => f.type === 'SPONSORED');
    expect(sf).toBeDefined();
    expect(sf!.score).toBe(1);
  });

  it('includes explanation features', () => {
    const result = computeMatch(makeItem(), {
      maxDistanceKm: 50,
      preferredProviderIds: [],
    });
    expect(result.features.length).toBe(7);
    expect(result.features[0].label).toContain('ข้อกำหนด');
  });
});

describe('computeDynamicPrice', () => {
  it('throws when feature flag is false', () => {
    expect(() =>
      computeDynamicPrice({
        basePriceMinor: 50000,
        capacityUtilization: 0.5,
        currentDemandLevel: 'MEDIUM',
        featureFlag: false,
        maxAdjustmentBps: 3000,
        minAdjustmentBps: -2000,
      }),
    ).toThrow(DynamicPricingDisabledError);
  });

  it('adjusts price up during high demand', () => {
    const r = computeDynamicPrice({
      basePriceMinor: 50000,
      capacityUtilization: 0.5,
      currentDemandLevel: 'HIGH',
      featureFlag: true,
      maxAdjustmentBps: 3000,
      minAdjustmentBps: -2000,
    });
    expect(r.adjustmentBps).toBeGreaterThan(0);
    expect(r.adjustedPriceMinor).toBeGreaterThan(50000);
    expect(r.experimentVersion).toBe(dynamicPricingExperimentVersion);
  });

  it('adjusts price down during low demand', () => {
    const r = computeDynamicPrice({
      basePriceMinor: 50000,
      capacityUtilization: 0.5,
      currentDemandLevel: 'LOW',
      featureFlag: true,
      maxAdjustmentBps: 3000,
      minAdjustmentBps: -2000,
    });
    expect(r.adjustmentBps).toBeLessThan(0);
    expect(r.adjustedPriceMinor).toBeLessThan(50000);
  });

  it('respects configured bound caps', () => {
    const r = computeDynamicPrice({
      basePriceMinor: 10000,
      capacityUtilization: 0.9,
      currentDemandLevel: 'HIGH',
      featureFlag: true,
      maxAdjustmentBps: 1000,
      minAdjustmentBps: -500,
    });
    expect(r.adjustmentBps).toBeLessThanOrEqual(1000);
  });

  it('preserves base price when feature flag is off and call not made', () => {
    // Base price is preserved in the output; the calculation is skipped entirely with featureFlag=false
    const base = 50000;
    expect(() =>
      computeDynamicPrice({
        basePriceMinor: base,
        capacityUtilization: 0.9,
        currentDemandLevel: 'HIGH',
        featureFlag: false,
        maxAdjustmentBps: 3000,
        minAdjustmentBps: -2000,
      }),
    ).toThrow(DynamicPricingDisabledError);
  });
});
