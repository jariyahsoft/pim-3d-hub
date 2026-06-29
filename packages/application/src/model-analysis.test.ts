import { describe, expect, it } from 'vitest';
import {
  ModelAnalysisDuplicateError,
  ModelAnalysisNotFoundError,
  ModelAnalysisUnsupportedFileError,
  createModelAnalysisService,
} from './model-analysis.js';
import { parseUuidv7 } from '@pim/domain';
import {
  createInMemoryAnalysisRequestRepository,
  createInMemoryModelAnalysisRepository,
  createSandboxModelAnalyzer,
} from '../../infrastructure/src/index.js';
import {
  createFakeClock,
  createFakeUuidGenerator,
} from '../../testkit/src/index.js';

function createUserId(index: string): ReturnType<typeof parseUuidv7> {
  return parseUuidv7(`018f18b2-4c4f-7c7a-9e12-${index.padStart(12, '0')}`);
}

function createHarness() {
  const clock = createFakeClock('2026-06-29T00:00:00.000Z');
  const fileAnalyses = createInMemoryModelAnalysisRepository();
  const analysisRequests = createInMemoryAnalysisRequestRepository();
  const uuidGenerator = createFakeUuidGenerator([
    '018f18b2-4c4f-7c7a-9e12-000000000001', // requestId (submitForAnalysis)
    '018f18b2-4c4f-7c7a-9e12-000000000002', // analysisId (submitForAnalysis - PENDING record)
    '018f18b2-4c4f-7c7a-9e12-000000000003', // analysisId (processAnalysis - COMPLETED record)
  ]);

  const service = createModelAnalysisService({
    analysisRequests: analysisRequests.repository,
    analyzer: createSandboxModelAnalyzer(),
    clock,
    fileAnalyses: fileAnalyses.repository,
    uuidGenerator,
  });

  return { clock, analysisRequests, fileAnalyses, service, uuidGenerator };
}

describe('model analysis service', () => {
  it('submits a file for analysis and returns a queued request', async () => {
    const harness = createHarness();
    const assetId = createUserId('100');
    const request = await harness.service.submitForAnalysis({
      assetId,
      fileAssetId: assetId,
      objectKey: 'private/standard/100/sample.stl',
      originalFilename: 'sample.stl',
      storageProvider: 'STANDARD',
    });

    expect(request.status).toBe('QUEUED');
    expect(request.assetId).toBe(assetId);
    expect(request.retryCategory).toBe('RETRY_TRANSIENT');
    expect(request.attemptCount).toBe(0);
    expect(request.triggerEvent).toBe('file.ready');

    // A PENDING analysis record is created ahead of processing.
    const analysis = await harness.service.getLatestAnalysis(assetId);
    expect(analysis).not.toBeNull();
    expect(analysis?.status).toBe('PENDING');
  });

  it('rejects unsupported file extensions with FILE_TYPE_UNSUPPORTED', async () => {
    const harness = createHarness();
    const assetId = createUserId('100');

    await expect(
      harness.service.submitForAnalysis({
        assetId,
        fileAssetId: assetId,
        objectKey: 'private/standard/100/sample.pdf',
        originalFilename: 'sample.pdf',
        storageProvider: 'STANDARD',
      }),
    ).rejects.toBeInstanceOf(ModelAnalysisUnsupportedFileError);
  });

  it('processes a queued analysis request and returns completed result', async () => {
    const harness = createHarness();
    const assetId = createUserId('100');

    const request = await harness.service.submitForAnalysis({
      assetId,
      fileAssetId: assetId,
      objectKey: 'private/standard/100/sample.stl',
      originalFilename: 'sample.stl',
      storageProvider: 'STANDARD',
    });

    const result = await harness.service.processAnalysis({
      requestId: request.id,
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.analyzerVersion).toBe('1.0.0-sandbox');
    expect(result.boundsMm[0]).toBe(100);
    expect(result.boundsMm[1]).toBe(80);
    expect(result.boundsMm[2]).toBe(60);
    expect(result.volumeMm3).toBeGreaterThan(0);
    expect(result.meshHealth.volumeClosed).toBe(true);
    expect(result.eligibilityHints.printVolumeEligible).toBe(true);
    expect(result.durationMs).toBeGreaterThan(0);

    // The request is marked SUCCEEDED.
    const req = await harness.service.getRequest(request.id);
    expect(req?.status).toBe('SUCCEEDED');
    expect(req?.analysisId).toBe(result.id);
  });

  it('rejects duplicate processing of an already succeeded request', async () => {
    const harness = createHarness();
    const assetId = createUserId('100');

    const request = await harness.service.submitForAnalysis({
      assetId,
      fileAssetId: assetId,
      objectKey: 'private/standard/100/sample.stl',
      originalFilename: 'sample.stl',
      storageProvider: 'STANDARD',
    });

    await harness.service.processAnalysis({ requestId: request.id });

    await expect(
      harness.service.processAnalysis({ requestId: request.id }),
    ).rejects.toBeInstanceOf(ModelAnalysisDuplicateError);
  });

  it('returns RESOURCE_NOT_FOUND for unknown request', async () => {
    const harness = createHarness();

    await expect(
      harness.service.processAnalysis({
        requestId: parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000099'),
      }),
    ).rejects.toBeInstanceOf(ModelAnalysisNotFoundError);
  });

  it('retryAnalysis throws for QUEUED requests (not yet failed)', async () => {
    const harness = createHarness();
    const assetId = createUserId('100');

    const request = await harness.service.submitForAnalysis({
      assetId,
      fileAssetId: assetId,
      objectKey: 'private/standard/100/sample.stl',
      originalFilename: 'sample.stl',
      storageProvider: 'STANDARD',
    });

    // A QUEUED request has not failed yet, so retry should be rejected.
    await expect(
      harness.service.retryAnalysis({ requestId: request.id }),
    ).rejects.toBeInstanceOf(ModelAnalysisDuplicateError);
  });

  it('retryAnalysis throws for already succeeded requests', async () => {
    const harness = createHarness();
    const assetId = createUserId('100');

    const request = await harness.service.submitForAnalysis({
      assetId,
      fileAssetId: assetId,
      objectKey: 'private/standard/100/sample.stl',
      originalFilename: 'sample.stl',
      storageProvider: 'STANDARD',
    });

    await harness.service.processAnalysis({ requestId: request.id });

    await expect(
      harness.service.retryAnalysis({ requestId: request.id }),
    ).rejects.toBeInstanceOf(ModelAnalysisDuplicateError);
  });

  it('getLatestAnalysis returns null for unknown asset', async () => {
    const harness = createHarness();
    const result = await harness.service.getLatestAnalysis(
      parseUuidv7('018f18b2-4c4f-7c7a-9e12-000000000099'),
    );
    expect(result).toBeNull();
  });

  it('returns submission analysis for unsupported file from analyzer delegation', async () => {
    const harness = createHarness();
    const assetId = createUserId('100');

    const request = await harness.service.submitForAnalysis({
      assetId,
      fileAssetId: assetId,
      objectKey: 'private/standard/100/sample.obj',
      originalFilename: 'sample.obj',
      storageProvider: 'STANDARD',
    });
    expect(request.status).toBe('QUEUED');

    // Process it successfully; OBJ is handled by the analyzer.
    const result = await harness.service.processAnalysis({
      requestId: request.id,
    });
    expect(result.status).toBe('COMPLETED');
  });
});
