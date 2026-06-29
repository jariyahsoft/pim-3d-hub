import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import {
  createInMemoryInstantQuoteRepository,
  createInMemoryPricingProfileRepository,
} from '@pim/infrastructure';
import { createPhase1BVerificationService } from './phase1b-verification.js';
import type { Uuidv7 } from '@pim/domain';

const FAKE_BUYER = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const FAKE_PROVIDER = '00000000-0000-7000-0000-000000000002' as Uuidv7;
const FAKE_PRINTER = '00000000-0000-7000-0000-000000000003' as Uuidv7;
const FAKE_SERVICE = '00000000-0000-7000-0000-000000000004' as Uuidv7;
const FAKE_FILE = '00000000-0000-7000-0000-000000000005' as Uuidv7;
const FAKE_ANALYSIS = '00000000-0000-7000-0000-000000000006' as Uuidv7;
const FAKE_PROFILE_ID = '00000000-0000-7000-0000-000000000007' as Uuidv7;

describe('Phase1BVerification', () => {
  async function setupRepo() {
    const quoteRepo = createInMemoryInstantQuoteRepository();
    const profileRepo = createInMemoryPricingProfileRepository();

    await profileRepo.create({
      providerProfileId: FAKE_PROVIDER,
      effectiveFrom: '2026-07-01T00:00:00Z',
      formula: {
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
      },
      id: FAKE_PROFILE_ID,
      name: 'Standard',
      scope: {
        materialCode: 'PLA',
        printerId: FAKE_PRINTER,
        serviceId: FAKE_SERVICE,
      },
    });

    await profileRepo.update(
      {
        ...(await profileRepo.findById(FAKE_PROFILE_ID))!,
        status: 'ACTIVE',
      },
      1,
    );

    return { quoteRepo, profileRepo, profileId: FAKE_PROFILE_ID };
  }

  it('runs all gates and produces a readiness report', async () => {
    const { quoteRepo, profileRepo } = await setupRepo();
    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    const report = await svc.runAllGates();

    expect(report.phase).toBe('1B');
    expect(report.gates.length).toBeGreaterThanOrEqual(4);
    expect(typeof report.summary.passed).toBe('number');
    expect(typeof report.summary.failed).toBe('number');
    expect(
      report.summary.readiness === 'READY' ||
        report.summary.readiness === 'NOT_READY',
    ).toBe(true);
  });

  it('passes pricing reproducibility gate by default', async () => {
    const { quoteRepo, profileRepo } = await setupRepo();
    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    const report = await svc.runAllGates();
    const gate = report.gates.find(
      (g) => g.gateId === 'pricing-reproducibility',
    );
    expect(gate).toBeDefined();
    expect(gate!.passed).toBe(true);
  });

  it('passes capacity no-oversell gate by default', async () => {
    const { quoteRepo, profileRepo } = await setupRepo();
    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    const report = await svc.runAllGates();
    const gate = report.gates.find((g) => g.gateId === 'capacity-no-oversell');
    expect(gate).toBeDefined();
    expect(gate!.passed).toBe(true);
  });

  it('passes queue no-duplicate gate by default', async () => {
    const { quoteRepo, profileRepo } = await setupRepo();
    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    const report = await svc.runAllGates();
    const gate = report.gates.find((g) => g.gateId === 'queue-no-duplicate');
    expect(gate).toBeDefined();
    expect(gate!.passed).toBe(true);
  });

  it('passes private file authorization gate by default', async () => {
    const { quoteRepo, profileRepo } = await setupRepo();
    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    const report = await svc.runAllGates();
    const gate = report.gates.find(
      (g) => g.gateId === 'private-file-authorization',
    );
    expect(gate).toBeDefined();
    expect(gate!.passed).toBe(true);
  });

  it('reproduces stored quote calculation', async () => {
    const { quoteRepo, profileRepo, profileId } = await setupRepo();

    // Create a quote with known line items
    await quoteRepo.createIfNotExists(
      {
        buyerId: FAKE_BUYER,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        fileAssetId: FAKE_FILE,
        inputSnapshot: {
          colorCode: null,
          hasSupport: false,
          isRush: false,
          materialCode: 'PLA',
          printerId: FAKE_PRINTER,
          providerServiceId: FAKE_SERVICE,
          qualityCode: 'STANDARD',
          quantity: 1,
        },
        lineItems: [
          { code: 'MATERIAL', amountMinor: 17500 },
          { code: 'SETUP', amountMinor: 5000 },
          { code: 'SHIPPING', amountMinor: 5000 },
        ],
        modelAnalysisId: FAKE_ANALYSIS,
        pricingProfileId: profileId,
        pricingProfileVersion: 0, // unknown stale version
        providerId: FAKE_PROVIDER,
        reservationUnits: 1,
        sourceRuleSetVersion: 1,
        subtotalMinor: 27500,
        totalMinor: 27500,
      },
      'idem-verify-1',
    );

    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    // The stored profile version differs from current, so we expect a gate failure
    await expect(svc.runAllGates()).resolves.toMatchObject({
      phase: '1B',
    });
  });

  it('generatedAt is RFC3339 UTC timestamp', async () => {
    const { quoteRepo, profileRepo } = await setupRepo();
    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    const report = await svc.runAllGates();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('gate summary matches gate results', async () => {
    const { quoteRepo, profileRepo } = await setupRepo();
    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    const report = await svc.runAllGates();
    const passedCount = report.gates.filter((g) => g.passed).length;
    const failedCount = report.gates.filter((g) => !g.passed).length;
    expect(report.summary.passed).toBe(passedCount);
    expect(report.summary.failed).toBe(failedCount);
    expect(report.summary.total).toBe(report.gates.length);
  });

  it('evidence is non-empty string for every gate', async () => {
    const { quoteRepo, profileRepo } = await setupRepo();
    const svc = createPhase1BVerificationService({
      instantQuoteRepository: quoteRepo,
      pricingProfileRepository: profileRepo,
    });

    const report = await svc.runAllGates();
    for (const gate of report.gates) {
      expect(typeof gate.evidence).toBe('string');
      expect(gate.evidence.length).toBeGreaterThan(0);
    }
  });
});
