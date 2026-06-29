import type {
  RepositoryListPage,
  RepositoryListRequest,
} from './repository.js';
import type { Uuidv7 } from './index.js';

export type ProductSearchSortField =
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'NEWEST'
  | 'RATING';

export type ProductSearchFilter = Readonly<{
  categoryCode?: string;
  condition?: 'NEW' | 'LIKE_NEW' | 'USED_GOOD' | 'USED_FAIR' | 'FOR_PARTS';
  maxPriceMinor?: number;
  minPriceMinor?: number;
  printerModelCode?: string;
  provinceCode?: string;
  query?: string;
}>;

export type ProductSearchResult = Readonly<{
  category: string;
  condition: string | null;
  currency: string;
  id: Uuidv7;
  priceMinor: number;
  productTitle: string;
  provinceCode: string | null;
  publisherUserId: Uuidv7;
  ratingAverage: number | null;
  ratingCount: number;
}>;

export type ProductSearchPort = Readonly<{
  search(
    request: RepositoryListRequest<ProductSearchFilter, ProductSearchSortField>,
  ): Promise<RepositoryListPage<ProductSearchResult>>;
}>;
