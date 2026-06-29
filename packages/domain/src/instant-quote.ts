import type {
  AnalysisEligibilityHints,
  DimensionsMm,
  MeshHealth,
  UtcTimestamp,
  Uuidv7,
} from './index.js';

// ── Eligibility reason codes ──────────────────────────────────────────────

/**
 * Versioned machine-readable eligibility reason codes.
 *
 * Version 1 codes — human-readable descriptions live in the presentation layer
 * (API resource bundle), not in the domain module.
 */
export const eligibilityReasonCodesV1 = [
  // Analysis
  'ANALYSIS_MISSING',
  'ANALYSIS_FAILED',
  'ANALYSIS_UNTRUSTED_VERSION',

  // Build volume
  'BUILD_VOLUME_EXCEEDED',
  'BUILD_VOLUME_UNKNOWN',

  // Service / printer
  'PRINTER_NOT_FOUND',
  'PRINTER_INACTIVE',
  'SERVICE_NOT_FOUND',
  'SERVICE_INACTIVE',

  // Material / color
  'MATERIAL_NOT_SUPPORTED',
  'COLOR_NOT_SUPPORTED',
  'QUALITY_NOT_SUPPORTED',
  'MATERIAL_OUT_OF_STOCK',

  // Pricing profile
  'PRICING_PROFILE_MISSING',
  'PRICING_PROFILE_INACTIVE',

  // Quantity
  'QUANTITY_EXCEEDS_CAPACITY',

  // Capacity
  'CAPACITY_UNAVAILABLE',

  // Due date
  'DUE_DATE_TOO_EARLY',

  // Manual / special
  'MANUAL_REVIEW_REQUIRED',
  'UNIT_AMBIGUITY',
  'TRUSTED_ANALYSIS_REQUIRED',
  'UNSUPPORTED_FILE_FORMAT',
] as const;

export type EligibilityReasonCode = (typeof eligibilityReasonCodesV1)[number];

// ── Eligibility result ────────────────────────────────────────────────────

export type EligibilityVerdict = Readonly<{
  eligible: boolean;
  reasonCodes: readonly EligibilityReasonCode[];
  /** Version of the reason-code schema used for this verdict. */
  schemaVersion: number;
}>;

// ── Eligibility input ─────────────────────────────────────────────────────

export type EligibilityCheckInput = Readonly<{
  analysis: Readonly<{
    analyzerVersion: string;
    boundsMm: readonly [number, number, number];
    eligibilityHints: AnalysisEligibilityHints;
    meshHealth: MeshHealth;
    status: string;
    units: string;
    volumeMm3: number;
  } | null>;
  buyerId: Uuidv7;
  dueDate: UtcTimestamp | null;
  fileAssetId: Uuidv7;
  materialCode: string;
  quantity: number;
  requestedColor: string;
  requestedQuality: string;
  serviceType: string;
}>;

export type EligibilityContext = Readonly<{
  printer: Readonly<{
    buildVolumeMm: DimensionsMm;
    id: Uuidv7;
    status: string;
    technologyCode: string;
  } | null>;
  providerMaterial: Readonly<{
    colorCode: string;
    materialCode: string;
    stockStatus: string;
  } | null>;
  providerService: Readonly<{
    instantOrderEnabled: boolean;
    leadTimeDays: number;
    status: string;
  } | null>;
  pricingProfile: Readonly<{
    effectiveFrom: UtcTimestamp;
    id: Uuidv7;
    status: string;
  } | null>;
  supportedQuality: boolean;
}>;

// ── Eligibility engine ────────────────────────────────────────────────────

/**
 * Run the eligibility check against analysis data and provider context.
 *
 * Returns a verdict with machine-readable reason codes. The engine uses the
 * schema version in the verdict so clients can determine which codes to expect.
 */
export function checkEligibility(
  input: EligibilityCheckInput,
  ctx: EligibilityContext,
): EligibilityVerdict {
  const reasons: EligibilityReasonCode[] = [];

  // 1. Analysis checks
  if (!input.analysis) {
    reasons.push('ANALYSIS_MISSING');
  } else if (input.analysis.status !== 'COMPLETED') {
    reasons.push('ANALYSIS_FAILED');
  } else if (
    !input.analysis.analyzerVersion ||
    input.analysis.analyzerVersion === ''
  ) {
    reasons.push('ANALYSIS_UNTRUSTED_VERSION');
  } else if (input.analysis.units === 'UNKNOWN') {
    reasons.push('UNIT_AMBIGUITY');
  }

  // 2. Build volume check
  if (input.analysis && ctx.printer) {
    const [w, d, h] = input.analysis.boundsMm;
    const pw = ctx.printer.buildVolumeMm.widthMm;
    const pd = ctx.printer.buildVolumeMm.depthMm;
    const ph = ctx.printer.buildVolumeMm.heightMm;

    if (w <= 0 || d <= 0 || h <= 0) {
      reasons.push('BUILD_VOLUME_UNKNOWN');
    } else if (w > pw || d > pd || h > ph) {
      reasons.push('BUILD_VOLUME_EXCEEDED');
    }
  }

  // 3. Printer / service status
  if (!ctx.printer) {
    reasons.push('PRINTER_NOT_FOUND');
  } else if (ctx.printer.status !== 'ACTIVE') {
    reasons.push('PRINTER_INACTIVE');
  }

  if (!ctx.providerService) {
    reasons.push('SERVICE_NOT_FOUND');
  } else if (ctx.providerService.status !== 'ACTIVE') {
    reasons.push('SERVICE_INACTIVE');
  }

  // 4. Material / color / quality
  if (!ctx.providerMaterial) {
    reasons.push('MATERIAL_NOT_SUPPORTED');
  } else if (ctx.providerMaterial.stockStatus === 'OUT_OF_STOCK') {
    reasons.push('MATERIAL_OUT_OF_STOCK');
  } else {
    if (ctx.providerMaterial.colorCode !== input.requestedColor) {
      reasons.push('COLOR_NOT_SUPPORTED');
    }
  }

  if (!ctx.supportedQuality) {
    reasons.push('QUALITY_NOT_SUPPORTED');
  }

  // 5. Pricing profile
  if (!ctx.pricingProfile) {
    reasons.push('PRICING_PROFILE_MISSING');
  } else if (ctx.pricingProfile.status !== 'ACTIVE') {
    reasons.push('PRICING_PROFILE_INACTIVE');
  }

  // 6. Quantity check
  if (input.quantity < 1) {
    reasons.push('QUANTITY_EXCEEDS_CAPACITY');
  }

  // 7. Due date feasibility
  if (input.dueDate && ctx.providerService) {
    const now = Date.now();
    const dueMs = new Date(input.dueDate).getTime();
    const minDueMs = now + ctx.providerService.leadTimeDays * 86400000;
    if (dueMs < minDueMs) {
      reasons.push('DUE_DATE_TOO_EARLY');
    }
  }

  // 8. Manual / special requirements from analysis hints
  if (input.analysis?.eligibilityHints) {
    const hints = input.analysis.eligibilityHints;
    if (hints.printVolumeEligible === false) {
      reasons.push('MANUAL_REVIEW_REQUIRED');
    }
  }

  // 9. Unsupported file format (handled at submission time, but double-check)
  // Already done at file upload / analysis submission level.

  // 10. Manual fallback if any hard blockers present
  // If the analysis is not trusted, require manual review
  if (
    reasons.includes('ANALYSIS_UNTRUSTED_VERSION') ||
    reasons.includes('UNIT_AMBIGUITY')
  ) {
    if (!reasons.includes('MANUAL_REVIEW_REQUIRED')) {
      reasons.push('MANUAL_REVIEW_REQUIRED');
    }
  }

  return {
    eligible: reasons.length === 0,
    reasonCodes: reasons,
    schemaVersion: 1,
  };
}
