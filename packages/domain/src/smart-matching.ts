import type { Uuidv7 } from './index.js';

export const matchingFeatureVersion = 1;

export type MatchFeature = Readonly<{
  label: string;
  score: number;
  type:
    | 'COMPATIBILITY'
    | 'LOCATION'
    | 'CAPACITY'
    | 'DELIVERY'
    | 'QUALITY'
    | 'PREFERENCE'
    | 'SPONSORED';
  weight: number;
}>;

export type MatchExplanation = Readonly<{
  features: readonly MatchFeature[];
  overallScore: number;
  rankingVersion: number;
}>;

export type MatchableItem = Readonly<{
  capacityAvailable: boolean;
  deliveryDays: number | null;
  distanceKm: number | null;
  id: Uuidv7;
  isSponsored: boolean;
  preferenceMatch: number;
  providerId: Uuidv7;
  qualityScore: number;
  ratingAverage: number | null;
  serviceTypeMatch: boolean;
  totalPriceMinor: number;
}>;

export function computeMatch(
  item: MatchableItem,
  buyerPreferences: {
    maxDistanceKm: number | null;
    preferredProviderIds: readonly Uuidv7[];
  },
): MatchExplanation {
  const features: MatchFeature[] = [];
  features.push({
    type: 'COMPATIBILITY',
    label: 'ข้อกำหนดของงานตรงกับบริการ',
    score: item.serviceTypeMatch ? 1 : 0,
    weight: 0.25,
  });
  let locScore = 0.5;
  if (item.distanceKm !== null && buyerPreferences.maxDistanceKm !== null)
    locScore = Math.max(
      0,
      1 - item.distanceKm / buyerPreferences.maxDistanceKm,
    );
  else if (item.distanceKm !== null)
    locScore = Math.max(0, 1 - item.distanceKm / 100);
  features.push({
    type: 'LOCATION',
    label: 'ระยะทาง',
    score: locScore,
    weight: 0.15,
  });
  features.push({
    type: 'CAPACITY',
    label: 'กำลังผลิตว่าง',
    score: item.capacityAvailable ? 1 : 0,
    weight: 0.1,
  });
  let delScore = 0.5;
  if (item.deliveryDays !== null)
    delScore = Math.max(0, 1 - item.deliveryDays / 30);
  features.push({
    type: 'DELIVERY',
    label: 'เวลาจัดส่ง',
    score: delScore,
    weight: 0.1,
  });
  features.push({
    type: 'QUALITY',
    label: 'คุณภาพและคะแนน',
    score: item.qualityScore,
    weight: 0.2,
  });
  features.push({
    type: 'PREFERENCE',
    label: 'ผู้ให้บริการที่ชื่นชอบ',
    score: buyerPreferences.preferredProviderIds.includes(item.providerId)
      ? 1
      : 0,
    weight: 0.1,
  });
  features.push({
    type: 'SPONSORED',
    label: 'โฆษณา',
    score: item.isSponsored ? 1 : 0,
    weight: 0.1,
  });
  const overallScore = features.reduce((sum, f) => sum + f.score * f.weight, 0);
  return { features, overallScore, rankingVersion: matchingFeatureVersion };
}

// ── Dynamic pricing ───────────────────────────────────────────────────────

export const dynamicPricingExperimentVersion = 1;

export type DynamicPricingInput = Readonly<{
  basePriceMinor: number;
  capacityUtilization: number;
  currentDemandLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  featureFlag: boolean;
  maxAdjustmentBps: number;
  minAdjustmentBps: number;
}>;

export type DynamicPricingResult = Readonly<{
  adjustedPriceMinor: number;
  adjustmentBps: number;
  adjustmentReason: string;
  basePriceMinor: number;
  experimentVersion: number;
}>;

export class DynamicPricingDisabledError extends Error {
  readonly code = 'DYNAMIC_PRICING_DISABLED';
  readonly status = 400;
  constructor() {
    super('Dynamic pricing is not enabled');
    this.name = 'DynamicPricingDisabledError';
  }
}

export function computeDynamicPrice(
  input: DynamicPricingInput,
): DynamicPricingResult {
  if (!input.featureFlag) throw new DynamicPricingDisabledError();
  let adj = 0;
  switch (input.currentDemandLevel) {
    case 'HIGH':
      adj += 2000;
      break;
    case 'LOW':
      adj -= 1000;
      break;
  }
  if (input.capacityUtilization > 0.8) adj += 1000;
  else if (input.capacityUtilization < 0.2) adj -= 500;
  adj = Math.max(input.minAdjustmentBps, Math.min(input.maxAdjustmentBps, adj));
  return {
    adjustedPriceMinor: Math.round(input.basePriceMinor * (1 + adj / 10000)),
    adjustmentBps: adj,
    adjustmentReason: `Demand: ${input.currentDemandLevel}, Capacity: ${Math.round(input.capacityUtilization * 100)}%`,
    basePriceMinor: input.basePriceMinor,
    experimentVersion: dynamicPricingExperimentVersion,
  };
}
