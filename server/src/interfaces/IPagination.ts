export interface ICursorPaginationOptions {
  limit: number;
  cursor?: string;
  direction?: "next" | "previous";
}

export interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
}
