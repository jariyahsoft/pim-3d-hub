import {
  type CategoryFields,
  type CreateProductInput,
  type ProductCategory,
  type ProductFilter,
  type ProductRecord,
  type ProductRepository,
  type ProductSortField,
  type ProductStatus,
  type ProductVariantInput,
  type RepositoryListPage,
  type RepositoryListRequest,
  type UpdateProductInput,
  type UsedPrinterEvidenceRecord,
  type Uuidv7,
  ProductVersionConflictError,
  ProductValidationError,
  ProductNotFoundError,
  assertProductTransition,
  isUsedPrinterEvidenceComplete,
  parseUtcTimestamp,
  validateProductAgainstSchema,
} from '@pim/domain';

// ── Command types ─────────────────────────────────────────────────────────

export type CreateProductCommand = Readonly<{
  actorUserId: Uuidv7;
  category: ProductCategory;
  categoryFields: CategoryFields;
  description: string;
  idempotencyKey: string;
  priceMinor: number;
  publisherUserId: Uuidv7;
  sku: string;
  title: string;
  usedPrinterEvidence?: UsedPrinterEvidenceRecord | null;
}>;

export type PublishProductCommand = Readonly<{
  actorUserId: Uuidv7;
  expectedVersion: number;
  productId: Uuidv7;
  usedPrinterEvidence?: UsedPrinterEvidenceRecord | null;
}>;

export type SuspendProductCommand = Readonly<{
  actorStaffId: Uuidv7;
  expectedVersion: number;
  moderationNote: string;
  productId: Uuidv7;
}>;

export type RecordInventoryCommand = Readonly<{
  actorUserId: Uuidv7;
  inventoryReservedUnits: number;
  inventoryTotalUnits: number;
  options: Readonly<Record<string, string>>;
  priceMinor: number;
  productId: Uuidv7;
  sku: string;
}>;

export type ListProductsQuery = Readonly<{
  cursor: string | null;
  filter?: ProductFilter;
  limit: number;
  sortDirection?: 'asc' | 'desc';
  sortField?: ProductSortField;
}>;

export type UpdateProductCommand = UpdateProductInput;

// ── DTOs ──────────────────────────────────────────────────────────────────

export type ProductVariantDto = Readonly<{
  inventoryReservedUnits: number;
  inventoryTotalUnits: number;
  options: Readonly<Record<string, string>>;
  priceMinor: number;
  sku: string;
}>;

export type ProductDto = Readonly<{
  category: ProductCategory;
  categoryFields: CategoryFields;
  categorySchemaVersion: number;
  createdAt: string;
  currency: string;
  description: string;
  evidenceComplete: boolean;
  id: Uuidv7;
  moderatedNotes: string | null;
  publisherUserId: Uuidv7;
  publishedAt: string | null;
  status: ProductStatus;
  title: string;
  usedPrinterEvidence: UsedPrinterEvidenceRecord | null;
  variants: readonly ProductVariantDto[];
  version: number;
}>;

function toDto(rec: ProductRecord): ProductDto {
  return {
    id: rec.id,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    categoryFields: rec.categoryFields,
    categorySchemaVersion: rec.categorySchemaVersion,
    currency: rec.currency,
    publisherUserId: rec.publisherUserId,
    publishedAt: rec.publishedAt,
    status: rec.status,
    moderatedNotes: rec.moderatedNotes,
    usedPrinterEvidence: rec.usedPrinterEvidence,
    variants: rec.variants.map((v) => ({
      sku: v.sku,
      priceMinor: v.priceMinor,
      options: { ...v.options },
      inventoryTotalUnits: v.inventoryTotalUnits,
      inventoryReservedUnits: v.inventoryReservedUnits,
    })),
    createdAt: rec.createdAt,
    version: rec.version,
    evidenceComplete: rec.usedPrinterEvidence
      ? isUsedPrinterEvidenceComplete(rec.usedPrinterEvidence)
      : false,
  };
}

// ── Errors (re-export shape) ──────────────────────────────────────────────

export class ProductServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ProductServiceError';
  }
}

// ── Service ports ─────────────────────────────────────────────────────────

export type ProductServicePorts = Readonly<{
  productRepository: ProductRepository;
  kycPort: {
    isSellerRoleVerified(userId: Uuidv7): Promise<boolean>;
  };
}>;

// ── Service ───────────────────────────────────────────────────────────────

export type ProductService = Readonly<{
  createDraft(command: CreateProductCommand): Promise<ProductDto>;
  getById(productId: Uuidv7): Promise<ProductDto>;
  list(query: ListProductsQuery): Promise<RepositoryListPage<ProductDto>>;
  publish(command: PublishProductCommand): Promise<ProductDto>;
  recordInventory(command: RecordInventoryCommand): Promise<ProductDto>;
  suspend(command: SuspendProductCommand): Promise<ProductDto>;
  update(command: UpdateProductCommand): Promise<ProductDto>;
}>;

export function assertProductVersionConflict(err: unknown): never {
  if (err instanceof Error && err.message.includes('version conflict')) {
    throw new ProductVersionConflictError(err.message);
  }
  throw err;
}

function ensureSellerVerified(
  publisherUserId: Uuidv7,
  port: ProductServicePorts['kycPort'],
): Promise<void> {
  return port.isSellerRoleVerified(publisherUserId).then((verified) => {
    if (!verified) {
      throw new ProductValidationError(
        ['publisherUserId'],
        `User ${publisherUserId} is not KYC-verified for selling`,
      );
    }
  });
}

export function createProductService(
  ports: ProductServicePorts,
): ProductService {
  const repo = ports.productRepository;

  async function createDraft(
    command: CreateProductCommand,
  ): Promise<ProductDto> {
    await ensureSellerVerified(command.publisherUserId, ports.kycPort);

    if (command.title.length < 3) {
      throw new ProductValidationError(
        ['title'],
        'Title must be at least 3 characters.',
      );
    }
    if (command.priceMinor < 0) {
      throw new ProductValidationError(
        ['priceMinor'],
        'Price must be non-negative.',
      );
    }

    const input: CreateProductInput = {
      actorUserId: command.actorUserId,
      category: command.category,
      categoryFields: command.categoryFields,
      description: command.description,
      priceMinor: command.priceMinor,
      publisherUserId: command.publisherUserId,
      sku: command.sku,
      title: command.title,
      usedPrinterEvidence: command.usedPrinterEvidence ?? null,
      status: 'DRAFT',
    };

    const result = await repo.createIfNotExists(input, command.idempotencyKey);
    return toDto(result.product);
  }

  async function getById(productId: Uuidv7): Promise<ProductDto> {
    const rec = await repo.findById(productId);
    if (!rec) throw new ProductNotFoundError(productId);
    return toDto(rec);
  }

  async function list(
    query: ListProductsQuery,
  ): Promise<RepositoryListPage<ProductDto>> {
    const request: RepositoryListRequest<ProductFilter, ProductSortField> = {
      cursor: query.cursor ?? undefined,
      filter: query.filter,
      limit: query.limit,
      sort: {
        direction: query.sortDirection ?? 'desc',
        field: query.sortField ?? 'updatedAt',
      },
    };
    const page = await repo.list(request);
    return {
      items: page.items.map(toDto),
      nextCursor: page.nextCursor,
    };
  }

  async function publish(command: PublishProductCommand): Promise<ProductDto> {
    const existing = await repo.findById(command.productId);
    if (!existing) throw new ProductNotFoundError(command.productId);
    if (existing.publisherUserId !== command.actorUserId) {
      throw new ProductValidationError(
        ['actorUserId'],
        'Only the publisher can publish this product',
      );
    }

    assertProductTransition(existing.status, 'PUBLISHED');

    const next: ProductRecord = {
      ...existing,
      status: 'PUBLISHED',
      publishedAt: parseUtcTimestamp(new Date()),
      updatedBy: command.actorUserId,
      usedPrinterEvidence:
        command.usedPrinterEvidence ?? existing.usedPrinterEvidence,
    };

    validateProductAgainstSchema(next);

    try {
      const rec = await repo.publish(
        command.productId,
        command.expectedVersion,
        next.publishedAt!,
      );
      // If evidence was supplied, persist it after publish
      if (
        command.usedPrinterEvidence &&
        command.usedPrinterEvidence !== existing.usedPrinterEvidence
      ) {
        const serialized = JSON.stringify(command.usedPrinterEvidence);
        const updated = await (repo as any).applyEvidence?.(
          command.productId,
          rec.version,
          serialized,
        );
        if (updated) return toDto(updated);
      }
      return toDto(rec);
    } catch (err) {
      assertProductVersionConflict(err);
      throw err;
    }
  }

  async function suspend(command: SuspendProductCommand): Promise<ProductDto> {
    try {
      const rec = await repo.suspend(
        command.productId,
        command.expectedVersion,
        command.moderationNote,
      );
      return toDto(rec);
    } catch (err) {
      assertProductVersionConflict(err);
      if (err instanceof Error && err.message.includes('not found')) {
        throw new ProductNotFoundError(command.productId);
      }
      throw err;
    }
  }

  async function update(command: UpdateProductCommand): Promise<ProductDto> {
    const existing = await repo.findById(command.productId);
    if (!existing) throw new ProductNotFoundError(command.productId);

    const next: ProductRecord = {
      ...existing,
      description: command.description ?? existing.description,
      title: command.title ?? existing.title,
      usedPrinterEvidence:
        command.usedPrinterEvidence ?? existing.usedPrinterEvidence,
    };

    try {
      const rec = await repo.update(next, command.expectedVersion);
      return toDto(rec);
    } catch (err) {
      assertProductVersionConflict(err);
      throw err;
    }
  }

  async function recordInventory(
    command: RecordInventoryCommand,
  ): Promise<ProductDto> {
    if (command.inventoryReservedUnits < 0) {
      throw new ProductValidationError(
        ['inventoryReservedUnits'],
        'Reserved units must be non-negative.',
      );
    }
    if (command.inventoryTotalUnits < command.inventoryReservedUnits) {
      throw new ProductValidationError(
        ['inventoryTotalUnits'],
        'Total units must be ≥ reserved units.',
      );
    }
    const input: ProductVariantInput = {
      actorUserId: command.actorUserId,
      inventoryReservedUnits: command.inventoryReservedUnits,
      inventoryTotalUnits: command.inventoryTotalUnits,
      options: command.options,
      priceMinor: command.priceMinor,
      productId: command.productId,
      sku: command.sku,
    };
    await repo.recordInventory(input);
    const existing = await repo.findById(command.productId);
    if (!existing) throw new ProductNotFoundError(command.productId);
    return toDto(existing);
  }

  return {
    createDraft,
    getById,
    list,
    publish,
    recordInventory,
    suspend,
    update,
  };
}
