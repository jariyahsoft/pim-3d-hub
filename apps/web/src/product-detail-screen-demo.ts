import type {
  PrinterCategoryFields,
  ProductCategory,
  ProductDto,
  ProductVariantDto,
  Uuidv7,
} from '@pim/application';

export const demoPrinterFields: PrinterCategoryFields = Object.freeze({
  ageMonths: 12,
  buildVolumeMm: null,
  condition: 'LIKE_NEW',
  defectNotes: '',
  includedItems: ['spool holder', 'cable'],
  maintenanceHistory: 'oil change at 6 months',
  serialNumberMasked: 'SN-XX-XX-1234',
  technologyCode: 'FDM',
  warrantyRemaining: '6 months',
});

const demoVariants: ProductVariantDto[] = [
  Object.freeze({
    sku: 'USED-001',
    priceMinor: 250000,
    inventoryTotalUnits: 3,
    inventoryReservedUnits: 1,
    options: { color: 'BLACK' },
  }),
];

export const demoUsedPrinterProduct: ProductDto = Object.freeze({
  id: '00000000-0000-7000-0000-000000000001' as Uuidv7,
  title: 'Used Ender 3 Pro (good condition)',
  description: 'Carefully used 3D printer in working condition',
  category: 'PRINTER' as ProductCategory,
  categoryFields: { category: 'PRINTER', fields: demoPrinterFields },
  categorySchemaVersion: 1,
  currency: 'THB',
  publisherUserId: '00000000-0000-7000-0000-000000000002' as Uuidv7,
  publishedAt: '2026-07-01T00:00:00Z',
  status: 'PUBLISHED',
  moderatedNotes: null,
  usedPrinterEvidence: {
    actorUserId: '00000000-0000-7000-0000-000000000003' as Uuidv7,
    approvedAt: null,
    approvedByUserId: null,
    assetId: null,
    completedAt: '2026-06-30T00:00:00Z',
    fields: {
      POWER_ON_TEST: true,
      HOMING_TEST: true,
      EXTRUSION_TEST: true,
      TEST_PRINT_ATTACHED: true,
      KNOWN_DEFECTS_DISCLOSED: true,
      MASKED_SERIAL_PROOF: true,
    },
    notes: 'all checks passed',
    productId: '00000000-0000-7000-0000-0000-1'.padEnd(36, '0') as Uuidv7,
  },
  variants: Object.freeze(
    demoVariants,
  ) as unknown as readonly ProductVariantDto[],
  createdAt: '2026-06-30T00:00:00Z',
  version: 4,
  evidenceComplete: true,
});

export const demoSuspendedProduct: ProductDto = Object.freeze({
  ...demoUsedPrinterProduct,
  status: 'SUSPENDED',
  moderatedNotes: 'under review',
});

export const demoIncompleteEvidenceProduct: ProductDto = Object.freeze({
  ...demoUsedPrinterProduct,
  evidenceComplete: false,
});

void demoIncompleteEvidenceProduct;
