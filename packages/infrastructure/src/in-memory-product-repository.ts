import {
  RepositoryConflictError,
  type CanonicalRecord,
  type CreateProductInput,
  type ProductFilter,
  type ProductRecord,
  type ProductRepository,
  type ProductSortField,
  type ProductVariantInput,
  type ProductVariantRecord,
  type RepositoryListPage,
  type RepositoryListRequest,
  type Uuidv7,
} from '@pim/domain';

interface PersistedProduct extends CanonicalRecord {
  category: string;
  categoryFields: string; // JSON
  categorySchemaVersion: number;
  currency: string;
  description: string;
  moderatedNotes: string | null;
  publisherUserId: string;
  publishedAt: string | null;
  sellerRoleVerifiedAt: string | null;
  status: string;
  title: string;
  usedPrinterEvidence: string | null; // JSON
  variants: string; // JSON
}

interface PersistedProductVariant extends CanonicalRecord {
  inventoryReservedUnits: number;
  inventoryTotalUnits: number;
  options: string; // JSON
  priceMinor: number;
  productId: string;
  sku: string;
}

function toDomain(rec: PersistedProduct): ProductRecord {
  return {
    ...rec,
    categoryFields: JSON.parse(rec.categoryFields),
    moderatedNotes: rec.moderatedNotes,
    sellerRoleVerifiedAt:
      rec.sellerRoleVerifiedAt as ProductRecord['sellerRoleVerifiedAt'],
    status: rec.status as ProductRecord['status'],
    category: rec.category as ProductRecord['category'],
    usedPrinterEvidence: rec.usedPrinterEvidence
      ? JSON.parse(rec.usedPrinterEvidence)
      : null,
    variants: JSON.parse(rec.variants),
  } as ProductRecord;
}

function toPersistence(rec: ProductRecord): PersistedProduct {
  return {
    ...rec,
    categoryFields: JSON.stringify(rec.categoryFields),
    usedPrinterEvidence: rec.usedPrinterEvidence
      ? JSON.stringify(rec.usedPrinterEvidence)
      : null,
    variants: JSON.stringify(rec.variants),
  } as PersistedProduct;
}

function variantToDomain(rec: PersistedProductVariant): ProductVariantRecord {
  return {
    ...rec,
    options: JSON.parse(rec.options),
  } as ProductVariantRecord;
}

export function createInMemoryProductRepository(): ProductRepository {
  const products = new Map<string, PersistedProduct>();
  const idempotencyIndex = new Map<string, string>();
  const variantsStore = new Map<string, PersistedProductVariant>();

  return {
    async createIfNotExists(
      input: CreateProductInput,
      idempotencyKey: string,
    ): Promise<{ created: boolean; product: ProductRecord }> {
      const idxKey = `${input.publisherUserId}:${idempotencyKey}`;
      const existingId = idempotencyIndex.get(idxKey);
      if (existingId) {
        const existing = products.get(existingId);
        if (existing) {
          return { created: false, product: toDomain(existing) };
        }
      }
      const now = new Date().toISOString();
      const id = input.id ?? crypto.randomUUID();
      const rec: ProductRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.updatedBy ?? null,
        category: input.category,
        categoryFields: input.categoryFields,
        categorySchemaVersion: 1,
        currency: input.currency ?? ('THB' as ProductRecord['currency']),
        description: input.description,
        moderatedNotes: null,
        publisherUserId: input.publisherUserId,
        publishedAt: null,
        sellerRoleVerifiedAt: null,
        status: input.status ?? 'DRAFT',
        title: input.title,
        usedPrinterEvidence: input.usedPrinterEvidence ?? null,
        variants: [],
      };
      products.set(id, toPersistence(rec));
      idempotencyIndex.set(idxKey, id);

      // Create variant
      const variantId = crypto.randomUUID();
      const variant: PersistedProductVariant = {
        id: variantId,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: null,
        productId: id,
        sku: input.sku,
        priceMinor: input.priceMinor,
        options: '{}',
        inventoryTotalUnits: 0,
        inventoryReservedUnits: 0,
      };
      variantsStore.set(variantId, variant);
      const updated: ProductRecord = {
        ...rec,
        variants: [variantToDomain(variant)],
      };
      products.set(id, toPersistence(updated));

      return { created: true, product: updated };
    },
    async create(input: CreateProductInput): Promise<ProductRecord> {
      const now = new Date().toISOString();
      const id = input.id ?? crypto.randomUUID();
      const rec: ProductRecord = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.updatedBy ?? null,
        category: input.category,
        categoryFields: input.categoryFields,
        categorySchemaVersion: 1,
        currency: input.currency ?? ('THB' as ProductRecord['currency']),
        description: input.description,
        moderatedNotes: null,
        publisherUserId: input.publisherUserId,
        publishedAt: null,
        sellerRoleVerifiedAt: null,
        status: input.status ?? 'DRAFT',
        title: input.title,
        usedPrinterEvidence: input.usedPrinterEvidence ?? null,
        variants: [],
      };
      products.set(id, toPersistence(rec));
      return rec;
    },
    async findById(
      id: Uuidv7,
      options?: { includeDeleted?: boolean },
    ): Promise<ProductRecord | null> {
      const rec = products.get(id);
      if (!rec) return null;
      if (rec.deletedAt && !options?.includeDeleted) return null;
      return toDomain(rec);
    },
    async list(
      request: RepositoryListRequest<ProductFilter, ProductSortField>,
    ): Promise<RepositoryListPage<ProductRecord>> {
      let items = Array.from(products.values()).filter((r) => !r.deletedAt);
      const filter = request.filter;
      if (filter) {
        if (filter.publisherUserId)
          items = items.filter(
            (r) => r.publisherUserId === filter.publisherUserId,
          );
        if (filter.category)
          items = items.filter((r) => r.category === filter.category);
        if (filter.status)
          items = items.filter((r) => r.status === filter.status);
      }
      const dir = request.sort.direction === 'desc' ? -1 : 1;
      items.sort((a, b) => {
        let cmp = 0;
        if (request.sort.field === 'publishedAt') {
          const av = a.publishedAt ?? a.createdAt;
          const bv = b.publishedAt ?? b.createdAt;
          cmp = av.localeCompare(bv);
        } else if (request.sort.field === 'createdAt') {
          cmp = a.createdAt.localeCompare(b.createdAt);
        } else {
          cmp = a.updatedAt.localeCompare(b.updatedAt);
        }
        return cmp * dir;
      });
      const start = request.cursor ? parseInt(request.cursor, 10) : 0;
      const page = items.slice(start, start + request.limit);
      return {
        items: page.map(toDomain),
        nextCursor:
          start + request.limit < items.length
            ? String(start + request.length)
            : null,
      };
    },
    async publish(
      id: Uuidv7,
      expectedVersion: number,
      publishedAt: string,
    ): Promise<ProductRecord> {
      const existing = products.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'Product',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'Product',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedProduct = {
        ...existing,
        version: existing.version + 1,
        status: 'PUBLISHED',
        publishedAt,
        updatedAt: new Date().toISOString(),
      };
      products.set(id, updated);
      return toDomain(updated);
    },
    async applyEvidence(
      id: Uuidv7,
      expectedVersion: number,
      evidenceJson: string,
    ): Promise<ProductRecord> {
      const existing = products.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'Product',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'Product',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedProduct = {
        ...existing,
        version: existing.version + 1,
        usedPrinterEvidence: evidenceJson,
        updatedAt: new Date().toISOString(),
      };
      products.set(id, updated);
      return toDomain(updated);
    },
    async recordInventory(
      input: ProductVariantInput,
    ): Promise<ProductVariantRecord> {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const variant: PersistedProductVariant = {
        id,
        schemaVersion: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: input.actorUserId ?? null,
        updatedBy: input.actorUserId ?? null,
        productId: input.productId,
        sku: input.sku,
        priceMinor: input.priceMinor,
        options: JSON.stringify(input.options ?? {}),
        inventoryTotalUnits: input.inventoryTotalUnits ?? 0,
        inventoryReservedUnits: input.inventoryReservedUnits ?? 0,
      };
      variantsStore.set(id, variant);

      // Update the parent product's variants array
      const parent = products.get(input.productId);
      if (parent) {
        const variantDomain = variantToDomain(variant);
        const updated = {
          ...parent,
          variants: JSON.stringify([
            ...JSON.parse(parent.variants),
            variantDomain,
          ]),
          version: parent.version + 1,
          updatedAt: now,
        };
        products.set(input.productId, updated);
      }

      return variantToDomain(variant);
    },
    async suspend(
      id: Uuidv7,
      expectedVersion: number,
      moderationNote: string,
    ): Promise<ProductRecord> {
      const existing = products.get(id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'Product',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: id,
          entityName: 'Product',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedProduct = {
        ...existing,
        version: existing.version + 1,
        status: 'SUSPENDED',
        moderatedNotes: moderationNote,
        updatedAt: new Date().toISOString(),
      };
      products.set(id, updated);
      return toDomain(updated);
    },
    async update(
      product: ProductRecord,
      expectedVersion: number,
    ): Promise<ProductRecord> {
      const existing = products.get(product.id);
      if (!existing) {
        throw new RepositoryConflictError({
          entityId: product.id,
          entityName: 'Product',
          expectedVersion,
          actualVersion: -1,
        });
      }
      if (existing.version !== expectedVersion) {
        throw new RepositoryConflictError({
          entityId: product.id,
          entityName: 'Product',
          expectedVersion,
          actualVersion: existing.version,
        });
      }
      const updated: PersistedProduct = {
        ...toPersistence(product),
        version: existing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      products.set(product.id, updated);
      return toDomain(updated);
    },
  };
}
