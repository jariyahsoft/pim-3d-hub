import {
  type CalculatorInput,
  type CalculatorResult,
  type DimensionsMm,
  type EligibilityCheckInput,
  type EligibilityContext,
  type EligibilityReasonCode,
  type ModelAnalysisRecord,
  type PricingProfileRepository,
  type UtcTimestamp,
  type Uuidv7,
  checkEligibility as domainCheckEligibility,
  calculatePrice,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type CheckInstantQuoteEligibilityCommand = Readonly<{
  actorUserId: Uuidv7;
  analysis: ModelAnalysisRecord | null;
  buyerId: Uuidv7;
  dueDate: UtcTimestamp | null;
  fileAssetId: Uuidv7;
  materialCode: string;
  printerId: Uuidv7;
  providerProfileId: Uuidv7;
  quantity: number;
  requestedColor: string;
  requestedQuality: string;
  serviceId: Uuidv7;
  serviceType: string;
}>;

export type CalculateQuoteCommand = Readonly<{
  actorUserId: Uuidv7;
  buyerId: Uuidv7;
  estimatedMinutes: number;
  hasSupport: boolean;
  isRush: boolean;
  materialCode: string;
  pricingProfileId: Uuidv7;
  qualityCode: string;
  quantity: number;
  volumeGrams: number;
}>;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type EligibilityVerdictDto = Readonly<{
  eligible: boolean;
  reasonCodes: readonly EligibilityReasonCode[];
  schemaVersion: number;
}>;

export type InstantQuoteDto = Readonly<{
  calculatorResult: CalculatorResult;
  eligibilityVerdict: EligibilityVerdictDto;
  pricingProfileId: Uuidv7;
  pricingProfileVersion: number;
}>;

export type ProviderEligibilityContext = Readonly<{
  printer: Readonly<{
    buildVolumeMm: DimensionsMm;
    id: Uuidv7;
    status: string;
    technologyCode: string;
  }> | null;
  providerMaterial: Readonly<{
    colorCode: string;
    materialCode: string;
    stockStatus: string;
  }> | null;
  providerService: Readonly<{
    instantOrderEnabled: boolean;
    leadTimeDays: number;
    status: string;
  }> | null;
  supportedQualities: readonly string[];
}>;

// ── Port — lookup provider context ────────────────────────────────────────

export type InstantQuoteContextPort = Readonly<{
  getEligibilityContext(
    providerProfileId: Uuidv7,
    serviceId: Uuidv7,
    printerId: Uuidv7,
    materialCode: string,
    colorCode: string,
    qualityCode: string,
  ): Promise<ProviderEligibilityContext>;
}>;

// ── Errors ────────────────────────────────────────────────────────────────

export class InstantQuoteIneligibleError extends Error {
  readonly code = 'QUOTE_INELIGIBLE';
  readonly reasonCodes: readonly EligibilityReasonCode[];
  readonly status = 422;

  constructor(reasonCodes: readonly EligibilityReasonCode[]) {
    super(`Instant quote ineligible: ${reasonCodes.join(', ')}`);
    this.name = 'InstantQuoteIneligibleError';
    this.reasonCodes = reasonCodes;
  }
}

export class InstantQuoteProfileNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(profileId: Uuidv7) {
    super(`Pricing profile ${profileId} not found`);
    this.name = 'InstantQuoteProfileNotFoundError';
  }
}

// ── Service ───────────────────────────────────────────────────────────────

export type InstantQuoteService = Readonly<{
  checkEligibility(
    command: CheckInstantQuoteEligibilityCommand,
    ctx: ProviderEligibilityContext,
  ): EligibilityVerdictDto;
  calculateQuote(command: CalculateQuoteCommand): Promise<InstantQuoteDto>;
}>;

export type InstantQuoteServicePorts = Readonly<{
  contextPort: InstantQuoteContextPort;
  pricingProfileRepository: PricingProfileRepository;
}>;

export function createInstantQuoteService(
  ports: InstantQuoteServicePorts,
): InstantQuoteService {
  async function checkEligibility(
    command: CheckInstantQuoteEligibilityCommand,
    providerContext: ProviderEligibilityContext,
  ): EligibilityVerdictDto {
    const input: EligibilityCheckInput = {
      analysis: command.analysis
        ? {
            analyzerVersion: command.analysis.analyzerVersion,
            boundsMm: command.analysis.boundsMm,
            eligibilityHints: command.analysis.eligibilityHints,
            meshHealth: command.analysis.meshHealth,
            status: command.analysis.status,
            units: command.analysis.units,
            volumeMm3: command.analysis.volumeMm3,
          }
        : null,
      buyerId: command.buyerId,
      dueDate: command.dueDate,
      fileAssetId: command.fileAssetId,
      materialCode: command.materialCode,
      quantity: command.quantity,
      requestedColor: command.requestedColor,
      requestedQuality: command.requestedQuality,
      serviceType: command.serviceType,
    };

    const ctx: EligibilityContext = {
      printer: providerContext.printer,
      providerMaterial: providerContext.providerMaterial,
      providerService: providerContext.providerService,
      pricingProfile: null, // filled in by the caller or a separate query
      supportedQuality: providerContext.supportedQualities.includes(
        command.requestedQuality,
      ),
    };

    return domainCheckEligibility(input, ctx);
  }

  async function calculateQuote(
    command: CalculateQuoteCommand,
  ): Promise<InstantQuoteDto> {
    const profile = await ports.pricingProfileRepository.findById(
      command.pricingProfileId,
    );
    if (!profile) {
      throw new InstantQuoteProfileNotFoundError(command.pricingProfileId);
    }

    const calculatorInput: CalculatorInput = {
      estimatedMinutes: command.estimatedMinutes,
      hasSupport: command.hasSupport,
      isRush: command.isRush,
      materialCode: command.materialCode as CalculatorInput['materialCode'],
      qualityCode: command.qualityCode,
      quantity: command.quantity,
      volumeGrams: command.volumeGrams,
    };

    const result = calculatePrice(profile, calculatorInput);

    // Also check simple eligibility (profile must be ACTIVE)
    const reasons: EligibilityReasonCode[] = [];
    if (profile.status !== 'ACTIVE') {
      reasons.push('PRICING_PROFILE_INACTIVE' as EligibilityReasonCode);
    }

    return {
      calculatorResult: result,
      eligibilityVerdict: {
        eligible: reasons.length === 0,
        reasonCodes: reasons,
        schemaVersion: 1,
      },
      pricingProfileId: profile.id,
      pricingProfileVersion: profile.versionNo,
    };
  }

  return {
    checkEligibility,
    calculateQuote,
  };
}
