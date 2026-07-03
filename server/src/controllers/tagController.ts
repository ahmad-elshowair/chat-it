import { NextFunction, Response } from 'express';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { tag_model } from './factory.js';
import config from '../configs/config.js';
import { sendResponse } from '../utilities/response.js';

/**
 * Get trending hashtags ranked by recent activity.
 * @route GET /api/tags/trending
 * @returns 200 with array of trending tags (max 20, empty list if no activity)
 */
const trending = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const tags = await tag_model.getTrending(config.tag_trending_window_hours, limit);
    return sendResponse.success(res, tags);
  } catch (error) {
    next(error);
  }
};

/**
 * Search tags by name using trigram similarity.
 * @route GET /api/tags/search?q=...
 * @returns 200 with array of matching tags (max 20)
 */
const search = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const tags = await tag_model.search(q, limit);
    return sendResponse.success(res, tags);
  } catch (error) {
    next(error);
  }
};

/**
 * Get paginated posts for a specific tag. Supports optional auth for interaction state.
 * @route GET /api/tags/:name/posts
 * @returns 200 with paginated IFeedPost results
 */
const postsByTag = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const name = req.params.name;
    const userId = req.user?.id;
    const originalLimit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const fetchLimit = originalLimit + 1;
    const cursor = req.query.cursor as string | undefined;
    const direction = (req.query.direction as 'next' | 'previous') || 'next';

    const results = await tag_model.getPostsByTag(name, userId, fetchLimit, cursor, direction);

    const hasMore = results.length > originalLimit;
    const items = hasMore ? results.slice(0, originalLimit) : results;

    const lastItem = items[items.length - 1];
    const firstItem = items[0];

    return sendResponse.success(res, {
      data: items,
      pagination: {
        hasMore,
        nextCursor: hasMore && lastItem?.post_id ? lastItem.post_id : undefined,
        previousCursor: firstItem?.post_id ? firstItem.post_id : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { trending, search, postsByTag };
