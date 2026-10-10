export type PaginatedApiResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type PageResult<T> = {
  items: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  next: string | null;
  previous: string | null;
};

export const isPaginatedResponse = <T>(data: any): data is PaginatedApiResponse<T> => {
  return !!data && typeof data === 'object' && Array.isArray(data.results) && typeof data.count === 'number';
};

export const toPageResult = <T>(
  data: PaginatedApiResponse<T>,
  page: number,
  pageSize: number,
): PageResult<T> => ({
  items: data.results,
  count: data.count,
  page,
  pageSize,
  totalPages: Math.max(1, Math.ceil(data.count / pageSize)),
  next: data.next,
  previous: data.previous,
});
