import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import {
  createInMemorySlicerProfileRepository,
  createInMemorySliceJobRepository,
} from '@pim/infrastructure';
import { createSlicerService, type SlicerSandboxPort } from './slicer.js';
import type { Uuidv7 } from '@pim/domain';

const FAKE_USER = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const FAKE_ASSET = '00000000-0000-7000-0000-000000000002' as Uuidv7;

function makeSandbox(): SlicerSandboxPort {
  return {
    async execute() {
      return {
        durationMs: 4500,
        estimatedDurationSec: 3600,
        estimatedFilamentGrams: 25,
        estimatedSupportGrams: 5,
        estimatedCostMinor: 12500,
      };
    },
    async cleanup() {},
  };
}

describe('SlicerService', () => {
  it('creates a slicer profile in DRAFT', async () => {
    const svc = createSlicerService({
      profileRepository: createInMemorySlicerProfileRepository(),
      jobRepository: createInMemorySliceJobRepository(),
      sandbox: makeSandbox(),
    });
    const dto = await svc.createProfile({
      actorUserId: FAKE_USER,
      description: 'Standard PLA',
      materialCode: 'PLA',
      printerTechnologyCode: 'FDM',
      profileCode: 'PRUSA_SLICER_2_8',
      qualityCode: 'STANDARD',
      settings: {
        layerHeightMm: 0.2,
        infillPercent: 20,
        supportType: 'TOUCHING_BUILDPLATE',
        printSpeedMmPerSec: 60,
        extruderTempC: 210,
        bedTempC: 60,
        extraSettings: '{}',
      },
    });
    expect(dto.status).toBe('DRAFT');
    expect(dto.profileCode).toBe('PRUSA_SLICER_2_8');
  });

  it('submits and processes a slice job', async () => {
    const svc = createSlicerService({
      profileRepository: createInMemorySlicerProfileRepository(),
      jobRepository: createInMemorySliceJobRepository(),
      sandbox: makeSandbox(),
    });
    const profile = await svc.createProfile({
      actorUserId: FAKE_USER,
      description: 'PETG',
      materialCode: 'PETG',
      printerTechnologyCode: 'FDM',
      profileCode: 'CURA_5_9',
      qualityCode: 'STANDARD',
      settings: {
        layerHeightMm: 0.2,
        infillPercent: 20,
        supportType: 'NONE',
        printSpeedMmPerSec: 50,
        extruderTempC: 235,
        bedTempC: 75,
        extraSettings: '{}',
      },
    });
    const job = await svc.submitSlice({
      actorUserId: FAKE_USER,
      dedupeKey: 'slice-1',
      fileAssetId: FAKE_ASSET,
      profileId: profile.id,
    });
    expect(job.status).toBe('QUEUED');
    const processed = await svc.processNextJob({
      actorUserId: FAKE_USER,
      workerId: 'w-1',
    });
    expect(processed).not.toBeNull();
    expect(processed!.estimate.estimatedDurationSec).toBe(3600);
  });

  it('deduplicates slice job submission', async () => {
    const svc = createSlicerService({
      profileRepository: createInMemorySlicerProfileRepository(),
      jobRepository: createInMemorySliceJobRepository(),
      sandbox: makeSandbox(),
    });
    const profile = await svc.createProfile({
      actorUserId: FAKE_USER,
      description: 'Dedup',
      materialCode: 'PLA',
      printerTechnologyCode: 'FDM',
      profileCode: 'PRUSA_SLICER_2_8',
      qualityCode: 'STANDARD',
      settings: {
        layerHeightMm: 0.2,
        infillPercent: 20,
        supportType: 'NONE',
        printSpeedMmPerSec: 60,
        extruderTempC: 210,
        bedTempC: 60,
        extraSettings: '{}',
      },
    });
    const j1 = await svc.submitSlice({
      actorUserId: FAKE_USER,
      dedupeKey: 'dd',
      fileAssetId: FAKE_ASSET,
      profileId: profile.id,
    });
    const j2 = await svc.submitSlice({
      actorUserId: FAKE_USER,
      dedupeKey: 'dd',
      fileAssetId: FAKE_ASSET,
      profileId: profile.id,
    });
    expect(j1.id).toBe(j2.id);
  });
});
