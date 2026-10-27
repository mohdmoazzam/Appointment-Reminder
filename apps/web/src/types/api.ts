import type { SortOrder } from './enums';

/** ISO-8601 timestamp as serialised by the API (e.g. "2026-10-26T09:30:00.000Z"). */
export type IsoDateTime = string;

/** Query params accepted by every paginated endpoint (PageOptionsDto in the API). */
export interface PageQuery {
  page?: number;
  /** Page size, 1-100. The API defaults to 25. */
  take?: number;
  order?: SortOrder;
}

/** PageMetaDto in the API. */
export interface PageMeta {
  page: number;
  take: number;
  count: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** PageDto in the API. */
export interface Page<T> {
  data: T[];
  meta: PageMeta;
}
