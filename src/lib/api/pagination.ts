import "server-only";
import { ApiRequestError, ApiErrorCodes } from "./response";

export const DEFAULT_PAGE_SIZE = 30;
export const MAX_PAGE_SIZE = 60; // matches the web /cards page's own `limit`

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginationMeta extends Pagination {
  total: number;
  totalPages: number;
}

/**
 * Parses `page`/`pageSize` query params defensively — never trusts them as
 * raw DB `skip`/`take` without bounds, so a client can't request an
 * unbounded page size or a negative/NaN offset.
 */
export function parsePagination(searchParams: URLSearchParams): Pagination {
  const rawPage = searchParams.get("page");
  const rawPageSize = searchParams.get("pageSize");

  const page = rawPage ? parseInt(rawPage, 10) : 1;
  if (!Number.isFinite(page) || page < 1) {
    throw new ApiRequestError(400, ApiErrorCodes.VALIDATION_ERROR, "`page` must be a positive integer.");
  }

  let pageSize = rawPageSize ? parseInt(rawPageSize, 10) : DEFAULT_PAGE_SIZE;
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    throw new ApiRequestError(400, ApiErrorCodes.VALIDATION_ERROR, "`pageSize` must be a positive integer.");
  }
  pageSize = Math.min(pageSize, MAX_PAGE_SIZE);

  return { page, pageSize };
}

export function paginationMeta(pagination: Pagination, total: number): PaginationMeta {
  return { ...pagination, total, totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)) };
}
