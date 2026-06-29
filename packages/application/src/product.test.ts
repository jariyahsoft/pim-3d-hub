import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-restricted-imports
import { createInMemoryProductRepository } from '@pim/infrastructure';
import { createProductService, ProductValidationError } from './product.js';
import type { Uuidv7 } from '@pim/domain';

const SELLER = '00000000-0000-7000-0000-000000000001' as Uuidv7;
const STAFF = '00000000-0000-7000-0000-000000000002' as Uuidv7;

function makeSvc(opts?: { verified?: boolean }) {
  const verified = opts?.verified ?? true;
  return {
    svc: createProductService({
      kycPort: {
        async isSellerRoleVerified() {
          return verified;
        },
      },
      productRepository: createInMemoryProductRepository(),
    }),
  };
}

describe('ProductService', () => {
  it('creates a PLA printer category product in DRAFT', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createDraft({
      actorUserId: SELLER,
      category: 'PRINTER',
      categoryFields: {
        category: 'PRINTER',
        fields: {
          ageMonths: 6,
          buildVolumeMm: null,
          condition: 'NEW',
          defectNotes: '',
          includedItems: [],
          maintenanceHistory: '',
          serialNumberMasked: null,
          technologyCode: null,
          warrantyRemaining: '6 months',
        },
      },
      description: 'Brand new 3D printer',
      idempotencyKey: 'prod-1',
      priceMinor: 1500000,
      publisherUserId: SELLER,
      sku: 'PRT-001',
      title: 'New Printer',
    });

    expect(dto.status).toBe('DRAFT');
    expect(dto.title).toBe('New Printer');
    expect(dto.variants).toHaveLength(1);
  });

  it('rejects unverified seller', async () => {
    const { svc } = makeSvc({ verified: false });
    await expect(
      svc.createDraft({
        actorUserId: SELLER,
        category: 'PART',
        categoryFields: {
          category: 'PART',
          fields: {
            compatiblePrinterModelCodes: ['model-a'],
            qualityCode: 'STANDARD',
          },
        },
        description: 'part',
        idempotencyKey: 'prod-2',
        priceMinor: 5000,
        publisherUserId: SELLER,
        sku: 'PRT-002',
        title: 'Part',
      }),
    ).rejects.toThrow(/KYC|seller/);
  });

  it('rejects short title', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.createDraft({
        actorUserId: SELLER,
        category: 'PART',
        categoryFields: {
          category: 'PART',
          fields: {
            compatiblePrinterModelCodes: [],
            qualityCode: 'STANDARD',
          },
        },
        description: 'desc',
        idempotencyKey: 'prod-3',
        priceMinor: 100,
        publisherUserId: SELLER,
        sku: 'PRT-003',
        title: 'ab',
      }),
    ).rejects.toThrow(ProductValidationError);
  });

  it('rejects negative price', async () => {
    const { svc } = makeSvc();
    await expect(
      svc.createDraft({
        actorUserId: SELLER,
        category: 'PART',
        categoryFields: {
          category: 'PART',
          fields: {
            compatiblePrinterModelCodes: [],
            qualityCode: 'STANDARD',
          },
        },
        description: 'desc',
        idempotencyKey: 'prod-4',
        priceMinor: -1,
        publisherUserId: SELLER,
        sku: 'PRT-004',
        title: 'abcd',
      }),
    ).rejects.toThrow(ProductValidationError);
  });

  it('used printer cannot be marked complete without evidence', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createDraft({
      actorUserId: SELLER,
      category: 'PRINTER',
      categoryFields: {
        category: 'PRINTER',
        fields: {
          ageMonths: 24,
          buildVolumeMm: null,
          condition: 'USED_GOOD',
          defectNotes: 'minor cosmetic',
          includedItems: [],
          maintenanceHistory: 'regular',
          serialNumberMasked: null,
          technologyCode: null,
          warrantyRemaining: 'none',
        },
      },
      description: 'Used printer, fully tested',
      idempotencyKey: 'used-1',
      priceMinor: 250000,
      publisherUserId: SELLER,
      sku: 'USED-001',
      title: 'Used Printer',
    });

    await expect(
      svc.publish({
        actorUserId: SELLER,
        expectedVersion: dto.version,
        productId: dto.id,
      }),
    ).rejects.toThrow(/USED_PRINTER_EVIDENCE_INCOMPLETE|evidence/i);
  });

  it('used printer with full evidence publishes successfully', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createDraft({
      actorUserId: SELLER,
      category: 'PRINTER',
      categoryFields: {
        category: 'PRINTER',
        fields: {
          ageMonths: 24,
          buildVolumeMm: null,
          condition: 'USED_GOOD',
          defectNotes: 'minor cosmetic',
          includedItems: [],
          maintenanceHistory: 'regular',
          serialNumberMasked: null,
          technologyCode: null,
          warrantyRemaining: 'none',
        },
      },
      description: 'Used printer with full evidence',
      idempotencyKey: 'used-2',
      priceMinor: 250000,
      publisherUserId: SELLER,
      sku: 'USED-002',
      title: 'Used Printer v2',
    });

    const published = await svc.publish({
      actorUserId: SELLER,
      expectedVersion: dto.version,
      productId: dto.id,
      usedPrinterEvidence: {
        actorUserId: SELLER,
        approvedAt: null,
        approvedByUserId: null,
        assetId: null,
        completedAt: null,
        fields: {
          POWER_ON_TEST: true,
          HOMING_TEST: true,
          EXTRUSION_TEST: true,
          TEST_PRINT_ATTACHED: true,
          KNOWN_DEFECTS_DISCLOSED: true,
          MASKED_SERIAL_PROOF: false,
        },
        notes: 'tested OK',
        productId: dto.id,
      },
    });

    expect(published.status).toBe('PUBLISHED');
    expect(published.evidenceComplete).toBe(true);
  });

  it('records inventory without throwing', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createDraft({
      actorUserId: SELLER,
      category: 'PART',
      categoryFields: {
        category: 'PART',
        fields: {
          compatiblePrinterModelCodes: [],
          qualityCode: 'STANDARD',
        },
      },
      description: 'spool',
      idempotencyKey: 'inv-1',
      priceMinor: 100,
      publisherUserId: SELLER,
      sku: 'SP-1',
      title: 'Spool',
    });

    await expect(
      svc.recordInventory({
        actorUserId: SELLER,
        inventoryReservedUnits: 5,
        inventoryTotalUnits: 20,
        options: { color: 'BLACK' },
        priceMinor: 100,
        productId: dto.id,
        sku: 'SP-1',
      }),
    ).resolves.toBeDefined();
  });

  it('rejects reserved > total inventory', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createDraft({
      actorUserId: SELLER,
      category: 'PART',
      categoryFields: {
        category: 'PART',
        fields: {
          compatiblePrinterModelCodes: [],
          qualityCode: 'STANDARD',
        },
      },
      description: 'spool',
      idempotencyKey: 'inv-2',
      priceMinor: 100,
      publisherUserId: SELLER,
      sku: 'SP-2',
      title: 'Spool',
    });

    await expect(
      svc.recordInventory({
        actorUserId: SELLER,
        inventoryReservedUnits: 30,
        inventoryTotalUnits: 20,
        options: {},
        priceMinor: 100,
        productId: dto.id,
        sku: 'SP-2',
      }),
    ).rejects.toThrow(ProductValidationError);
  });

  it('suspends a published product', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createDraft({
      actorUserId: SELLER,
      category: 'PART',
      categoryFields: {
        category: 'PART',
        fields: {
          compatiblePrinterModelCodes: [],
          qualityCode: 'STANDARD',
        },
      },
      description: 'a part long enough',
      idempotencyKey: 'susp-1',
      priceMinor: 100,
      publisherUserId: SELLER,
      sku: 'SUSP-1',
      title: 'Susp Product',
    });

    const published = await svc.publish({
      actorUserId: SELLER,
      expectedVersion: dto.version,
      productId: dto.id,
    });

    const suspended = await svc.suspend({
      actorStaffId: STAFF,
      expectedVersion: published.version,
      moderationNote: 'investigation',
      productId: dto.id,
    });

    expect(suspended.status).toBe('SUSPENDED');
    expect(suspended.moderatedNotes).toBe('investigation');
  });

  it('rejects publish of non-owned product', async () => {
    const { svc } = makeSvc();
    const dto = await svc.createDraft({
      actorUserId: SELLER,
      category: 'PART',
      categoryFields: {
        category: 'PART',
        fields: {
          compatiblePrinterModelCodes: [],
          qualityCode: 'STANDARD',
        },
      },
      description: 'desc',
      idempotencyKey: 'no-1',
      priceMinor: 100,
      publisherUserId: SELLER,
      sku: 'NO-1',
      title: 'NO Product',
    });

    await expect(
      svc.publish({
        actorUserId: STAFF,
        expectedVersion: dto.version,
        productId: dto.id,
      }),
    ).rejects.toThrow(/publisher|only/i);
  });
});
