import {
  type ProductRecord,
  type ProductRepository,
  type ProductSearchFilter,
  type ProductSearchResult,
  type ProductSearchSortField,
  type RepositoryListPage,
  type RepositoryListRequest,
} from '@pim/domain';

export function createInMemoryProductSearchAdapter(
  productRepo: ProductRepository,
): ProductSearchPort {
  return {
    async search(
      request: RepositoryListRequest<
        ProductSearchFilter,
        ProductSearchSortField
      >,
    ): Promise<RepositoryListPage<ProductSearchResult>> {
      // Pull published products only
      const page = await productRepo.list({
        cursor: request.cursor,
        filter: { status: 'PUBLISHED' },
        limit: request.limit,
        sort: {
          direction: 'desc',
          field: 'updatedAt',
        },
      } as unknown as Parameters<ProductRepository['list']>[0]);

      let items = page.items as unknown as ProductRecord[];

      const f = request.filter;
      if (f) {
        if (f.query) {
          const q = f.query.toLowerCase();
          items = items.filter(
            (p) =>
              p.title.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q),
          );
        }
        if (f.categoryCode) {
          items = items.filter((p) => p.category === f.categoryCode);
        }
        if (f.minPriceMinor !== undefined || f.maxPriceMinor !== undefined) {
          items = items.filter((p) => {
            const v = p.variants[0];
            if (!v) return false;
            const price = v.priceMinor;
            if (f.minPriceMinor !== undefined && price < f.minPriceMinor) {
              return false;
            }
            if (f.maxPriceMinor !== undefined && price > f.maxPriceMinor) {
              return false;
            }
            return true;
          });
        }
        if (f.condition) {
          items = items.filter((p) => {
            if (p.category !== 'PRINTER') return false;
            if (p.categoryFields.category !== 'PRINTER') return false;
            return p.categoryFields.fields.condition === f.condition;
          });
        }
      }

      // Sort by user-requested field
      const dir = request.sort.direction === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        const ap = a.variants[0]?.priceMinor ?? 0;
        const bp = b.variants[0]?.priceMinor ?? 0;
        if (request.sort.field === 'PRICE_ASC') return (ap - bp) * dir;
        if (request.sort.field === 'PRICE_DESC') return (bp - ap) * dir;
        if (request.sort.field === 'NEWEST') {
          return (
            new Date(b.publishedAt ?? b.createdAt).getTime() -
            new Date(a.publishedAt ?? a.createdAt).getTime()
          );
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      });

      const results: ProductSearchResult[] = items.map((p) => ({
        id: p.id,
        productTitle: p.title,
        category: p.category,
        condition:
          p.category === 'PRINTER' && p.categoryFields.category === 'PRINTER'
            ? p.categoryFields.fields.condition
            : null,
        priceMinor: p.variants[0]?.priceMinor ?? 0,
        currency: p.currency,
        publisherUserId: p.publisherUserId,
        provinceCode: null,
        ratingAverage: null,
        ratingCount: 0,
      }));

      return {
        items: results,
        nextCursor: page.nextCursor,
      };
    },
  };
}
