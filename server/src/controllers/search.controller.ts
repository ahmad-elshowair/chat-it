import { NextFunction, Response } from 'express';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { search_model } from './factory.js';
import { sendResponse } from '../utilities/response.js';

/**
 * Search posts by keywords using full-text search.
 * @route GET /api/search?q=...&limit=...&cursor=...&direction=...
 * @returns 200 with paginated search results, 400 for validation errors, 401 if unauthenticated
 */
const search = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const q = req.query.q as string;
    const originalLimit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const fetchLimit = originalLimit + 1;
    const cursor = req.query.cursor as string | undefined;
    const direction = (req.query.direction as 'next' | 'previous') || 'next';

    const results = await search_model.search(user_id, q, fetchLimit, cursor, direction);

    const hasMore = results.length > originalLimit;
    const items = hasMore ? results.slice(0, originalLimit) : results;

    const cleaned = items.map(({ rank: _rank, ...post }) => post);

    const lastItem = items[items.length - 1];
    const firstItem = items[0];

    return sendResponse.success(res, {
      data: cleaned,
      pagination: {
        hasMore,
        nextCursor:
          hasMore && lastItem
            ? search_model.encodeCursor(lastItem.rank, lastItem.post_id!)
            : undefined,
        previousCursor: firstItem
          ? search_model.encodeCursor(firstItem.rank, firstItem.post_id!)
          : undefined,
      },
    });
  } catch (error) {
    if ((error as { message?: string }).message === 'Invalid cursor: referenced post not found') {
      return sendResponse.error(res, 'Invalid cursor', 400);
    }
    if ((error as { message?: string }).message === 'Invalid cursor format') {
      return sendResponse.error(res, 'Invalid cursor', 400);
    }
    if ((error as { message?: string }).message === 'Invalid cursor: malformed encoding') {
      return sendResponse.error(res, 'Invalid cursor', 400);
    }
    console.error('[searchController] search error:', error);
    next(error);
  }
};

export default { search };
