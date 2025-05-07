import { Request } from "express";
import {
  ICursorPaginationOptions,
  IPaginatedResult,
} from "../interfaces/IPagination";

export const getCursorPaginationOptions = (req: Request) => {
  return {
    limit: parseInt(req.query.limit as string) || 10,
    cursor: req.query.cursor as string | undefined,
    direction: (req.query.direction as "next" | "previous") || "next",
  };
};

export const createPaginationResult = <T>(
  data: T[],
  options: ICursorPaginationOptions,
  totalCount: number,
  idField: keyof T
): IPaginatedResult<T> => {
  const loadedItemsCount = options.cursor ? options.limit : 0;

  const hasMore =
    data.length === options.limit &&
    data.length + loadedItemsCount < totalCount;

  const lastItem = data[data.length - 1];
  const firstItem = data[0];
  return {
    data,
    pagination: {
      hasMore,
      nextCursor: hasMore && lastItem ? String(lastItem[idField]) : undefined,
      previousCursor: firstItem ? String(firstItem[idField]) : undefined,
    },
  };
};
