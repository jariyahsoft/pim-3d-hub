import type {
  CanonicalRecord,
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type {
  CurrencyCode,
  Millimeter,
  PrinterColorCode,
  PrinterMaterialCode,
  PrinterQualityCode,
  PrinterTechnologyCode,
  UtcTimestamp,
  Uuidv7,
} from './index.js';

// ── Category schemas ──────────────────────────────────────────────────────

/**
 * Versioned category schema identifier. Each new schema migration bumps the
 * version stamp; validation compares incoming product data against the
 * declared schema version and rejects on mismatch.
 */
export const productCategorySchemaVersion = 1;

export const productCategories = [
  'PRINTER',
  'MATERIAL',
  'PART',
  'ACCESSORY',
] as const;
export type ProductCategory = (typeof productCategories)[number];

export const productSortFields = [
  'createdAt',
  'updatedAt',
  'publishedAt',
] as const;
export type ProductSortField = (typeof productSortFields)[number];

// ── Category-specific fields ──────────────────────────────────────────────

export type PrinterCategoryFields = Readonly<{
  ageMonths: number | null;
  buildVolumeMm: Readonly<{
    widthMm: Millimeter;
    depthMm: Millimeter;
    heightMm: Millimeter;
  }> | null;
  condition: 'NEW' | 'LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR' | 'FOR_PARTS';
  defectNotes: string;
  includedItems: readonly string[];
  maintenanceHistory: string;
  serialNumberMasked: string | null;
  technologyCode: PrinterTechnologyCode | null;
  warrantyRemaining: string;
}>;

export type MaterialCategoryFields = Readonly<{
  colorCode: PrinterColorCode;
  materialCode: PrinterMaterialCode;
  netWeightGrams: number;
}>;

export type PartCategoryFields = Readonly<{
  compatiblePrinterModelCodes: readonly string[];
  qualityCode: PrinterQualityCode;
}>;

export type AccessoryCategoryFields = Readonly<{
  accessoryType: string;
  dimensionsMm: Readonly<{
    widthMm: Millimeter;
    depthMm: Millimeter;
    heightMm: Millimeter;
  }> | null;
}>;

export type CategoryFields =
  | { category: 'PRINTER'; fields: PrinterCategoryFields }
  | { category: 'MATERIAL'; fields: MaterialCategoryFields }
  | { category: 'PART'; fields: PartCategoryFields }
  | { category: 'ACCESSORY'; fields: AccessoryCategoryFields };

// ── Product lifecycle ────────────────────────────────────────────────────

export const productStatuses = [
  'DRAFT',
  'PUBLISHED',
  'SUSPENDED',
  'REMOVED',
] as const;
export type ProductStatus = (typeof productStatuses)[number];

const allowedProductTransitions: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: ['PUBLISHED', 'REMOVED'],
  PUBLISHED: ['SUSPENDED', 'REMOVED', 'DRAFT'],
  SUSPENDED: ['PUBLISHED', 'REMOVED'],
  REMOVED: [],
};

export class ProductStateTransitionError extends Error {
  readonly code = 'STATE_TRANSITION_ERROR';
  readonly currentStatus: ProductStatus;
  readonly status = 422;
  readonly targetStatus: ProductStatus;

  constructor(input: {
    currentStatus: ProductStatus;
    targetStatus: ProductStatus;
  }) {
    super(
      `Product cannot transition from ${input.currentStatus} to ${input.targetStatus}`,
    );
    this.name = 'ProductStateTransitionError';
    this.currentStatus = input.currentStatus;
    this.targetStatus = input.targetStatus;
  }
}

export function assertProductTransition(
  current: ProductStatus,
  target: ProductStatus,
): void {
  if (!allowedProductTransitions[current].includes(target)) {
    throw new ProductStateTransitionError({
      currentStatus: current,
      targetStatus: target,
    });
  }
}

// ── Evidence (used-printer checklist) ────────────────────────────────────

export const usedPrinterEvidenceFields = [
  'POWER_ON_TEST',
  'HOMING_TEST',
  'EXTRUSION_TEST',
  'TEST_PRINT_ATTACHED',
  'KNOWN_DEFECTS_DISCLOSED',
  'MASKED_SERIAL_PROOF',
] as const;
export type UsedPrinterEvidenceField =
  (typeof usedPrinterEvidenceFields)[number];

export type UsedPrinterEvidenceRecord = Readonly<{
  actorUserId: Uuidv7;
  approvedAt: UtcTimestamp | null;
  approvedByUserId: Uuidv7 | null;
  assetId: Uuidv7 | null;
  completedAt: UtcTimestamp | null;
  fields: Readonly<Record<UsedPrinterEvidenceField, boolean>>;
  notes: string;
  productId: Uuidv7;
}>;

export const REQUIRED_USED_PRINTER_EVIDENCE_FIELDS: readonly UsedPrinterEvidenceField[] =
  [
    'POWER_ON_TEST',
    'HOMING_TEST',
    'EXTRUSION_TEST',
    'TEST_PRINT_ATTACHED',
    'KNOWN_DEFECTS_DISCLOSED',
  ];

export function isUsedPrinterEvidenceComplete(
  evidence: UsedPrinterEvidenceRecord,
): boolean {
  return REQUIRED_USED_PRINTER_EVIDENCE_FIELDS.every((f) => evidence.fields[f]);
}

// ── Product record ───────────────────────────────────────────────────────

export type ProductVariantRecord = Readonly<
  CanonicalRecord & {
    inventoryReservedUnits: number;
    inventoryTotalUnits: number;
    options: Readonly<Record<string, string>>;
    priceMinor: number;
    sku: string;
  }
>;

export type ProductRecord = Readonly<
  CanonicalRecord & {
    category: ProductCategory;
    categoryFields: CategoryFields;
    categorySchemaVersion: number;
    currency: CurrencyCode;
    description: string;
    moderatedNotes: string | null;
    publisherUserId: Uuidv7;
    publishedAt: UtcTimestamp | null;
    sellerRoleVerifiedAt: UtcTimestamp | null;
    status: ProductStatus;
    title: string;
    usedPrinterEvidence: UsedPrinterEvidenceRecord | null;
    variants: readonly ProductVariantRecord[];
  }
>;

export type CreateProductInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  category: ProductCategory;
  categoryFields: CategoryFields;
  currency?: CurrencyCode;
  description: string;
  id?: Uuidv7;
  priceMinor: number;
  publisherUserId: Uuidv7;
  sku: string;
  status?: ProductStatus;
  title: string;
  updatedBy?: Uuidv7 | null;
  usedPrinterEvidence?: UsedPrinterEvidenceRecord | null;
}>;

export type UpdateProductInput = Readonly<{
  description?: string;
  expectedVersion: number;
  productId: Uuidv7;
  title?: string;
  usedPrinterEvidence?: UsedPrinterEvidenceRecord | null;
}>;

export type ProductFilter = Readonly<{
  category?: ProductCategory;
  publisherUserId?: Uuidv7;
  status?: ProductStatus;
}>;

// ── Repository ───────────────────────────────────────────────────────────

export type ProductVariantInput = Readonly<{
  actorUserId?: Uuidv7 | null;
  inventoryReservedUnits?: number;
  inventoryTotalUnits?: number;
  options?: Readonly<Record<string, string>>;
  priceMinor: number;
  productId: Uuidv7;
  sku: string;
}>;

export type ProductRepository = Readonly<{
  applyEvidence?(
    id: Uuidv7,
    expectedVersion: number,
    evidenceJson: string,
  ): Promise<ProductRecord>;
  create(input: CreateProductInput): Promise<ProductRecord>;
  createIfNotExists(
    input: CreateProductInput,
    idempotencyKey: string,
  ): Promise<Readonly<{ created: boolean; product: ProductRecord }>>;
  findById(
    id: Uuidv7,
    options?: Readonly<{ includeDeleted?: boolean }>,
  ): Promise<ProductRecord | null>;
  list(
    request: RepositoryListRequest<ProductFilter, ProductSortField>,
  ): Promise<RepositoryListPage<ProductRecord>>;
  publish(
    id: Uuidv7,
    expectedVersion: number,
    publishedAt: UtcTimestamp,
  ): Promise<ProductRecord>;
  recordInventory(input: ProductVariantInput): Promise<ProductVariantRecord>;
  suspend(
    id: Uuidv7,
    expectedVersion: number,
    moderationNote: string,
  ): Promise<ProductRecord>;
  update(
    product: ProductRecord,
    expectedVersion: number,
  ): Promise<ProductRecord>;
}>;

// ── Errors ────────────────────────────────────────────────────────────────

export class ProductValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  readonly fields: readonly string[];
  readonly status = 422;

  constructor(fields: readonly string[], message: string) {
    super(message);
    this.name = 'ProductValidationError';
    this.fields = fields;
  }
}

export class ProductNotFoundError extends Error {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly status = 404;

  constructor(id: Uuidv7) {
    super(`Product ${id} not found`);
    this.name = 'ProductNotFoundError';
  }
}

export class ProductVersionConflictError extends Error {
  readonly code = 'RESOURCE_VERSION_CONFLICT';
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ProductVersionConflictError';
  }
}

export class ProductUsedPrinterEvidenceIncompleteError extends Error {
  readonly code = 'USED_PRINTER_EVIDENCE_INCOMPLETE';
  readonly status = 422;

  constructor(productId: Uuidv7, missing: readonly UsedPrinterEvidenceField[]) {
    super(
      `Product ${productId} cannot be marked complete without used-printer evidence fields: ${missing.join(', ')}`,
    );
    this.name = 'ProductUsedPrinterEvidenceIncompleteError';
  }
}

// ── Validation helpers ────────────────────────────────────────────────────

/**
 * Validate a product against its declared category schema. The current
 * schema version is `productCategorySchemaVersion`; future migrations will
 * add a v2 with stricter rules.
 */
export function validateProductAgainstSchema(product: ProductRecord): void {
  if (product.categorySchemaVersion !== productCategorySchemaVersion) {
    throw new ProductValidationError(
      ['categorySchemaVersion'],
      `Product schema version ${product.categorySchemaVersion} is not supported; current is ${productCategorySchemaVersion}.`,
    );
  }

  if (product.categoryFields.category !== product.category) {
    throw new ProductValidationError(
      ['categoryFields.category'],
      `Category fields do not match product category ${product.category}.`,
    );
  }

  if (product.title.length < 3 || product.title.length > 200) {
    throw new ProductValidationError(
      ['title'],
      'Title must be between 3 and 200 characters.',
    );
  }

  if (product.description.length < 10) {
    throw new ProductValidationError(
      ['description'],
      'Description must be at least 10 characters.',
    );
  }

  for (const v of product.variants) {
    if (v.priceMinor < 0) {
      throw new ProductValidationError(
        ['variants[].priceMinor'],
        `Variant ${v.sku} has negative price.`,
      );
    }
    if (v.inventoryTotalUnits < 0) {
      throw new ProductValidationError(
        ['variants[].inventoryTotalUnits'],
        `Variant ${v.sku} has negative inventory.`,
      );
    }
    if (v.inventoryReservedUnits > v.inventoryTotalUnits) {
      throw new ProductValidationError(
        ['variants[].inventoryReservedUnits'],
        `Variant ${v.sku} reserved units exceed total.`,
      );
    }
  }

  // Used-printer evidence is required for PRINTER category when condition is USED_*
  if (product.category === 'PRINTER') {
    if (product.categoryFields.category !== 'PRINTER') return;
    const printer = product.categoryFields.fields;
    if (
      printer.condition === 'USED_GOOD' ||
      printer.condition === 'USED_FAIR' ||
      printer.condition === 'LIKE_NEW'
    ) {
      if (!product.usedPrinterEvidence) {
        throw new ProductUsedPrinterEvidenceIncompleteError(product.id, [
          'POWER_ON_TEST',
          'HOMING_TEST',
          'EXTRUSION_TEST',
          'TEST_PRINT_ATTACHED',
          'KNOWN_DEFECTS_DISCLOSED',
        ]);
      }
      // Optional field MASKED_SERIAL_PROOF is excluded from required
      const requiredFields: readonly UsedPrinterEvidenceField[] = [
        'POWER_ON_TEST',
        'HOMING_TEST',
        'EXTRUSION_TEST',
        'TEST_PRINT_ATTACHED',
        'KNOWN_DEFECTS_DISCLOSED',
      ];
      const missing = requiredFields.filter(
        (f) => !product.usedPrinterEvidence!.fields[f],
      );
      if (missing.length > 0) {
        throw new ProductUsedPrinterEvidenceIncompleteError(
          product.id,
          missing,
        );
      }
    }
  }
}

export function isProductPubliclyVisible(product: ProductRecord): boolean {
  if (product.status !== 'PUBLISHED') return false;
  if (!product.publishedAt) return false;
  return true;
}
