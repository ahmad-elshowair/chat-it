import { NextFunction, Response } from 'express';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { IPaginatedResult } from '../interfaces/IPagination.js';
import { TShare, TShareUser } from '../types/share.js';
import { AppError } from '../utilities/appError.js';
import { classifyPgError } from '../utilities/pgError.js';
import { createPaginationResult, getCursorPaginationOptions } from '../utilities/pagination.js';
import { sendResponse } from '../utilities/response.js';
import { share_model } from './factory.js';

/**
 * Create a share (simple repost or quote post). Idempotent.
 * @route POST /api/shares/:post_id
 * @returns 200 with the created TShare on new share, or 200 with already_shared on duplicate; 422 on self-share; 404 if post missing
 */
const sharePost = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const post_id = req.params.post_id;
    const commentary = req.body?.commentary ?? null;

    const result = await share_model.share(user_id, post_id, commentary);

    if (result.action === 'shared' && result.share) {
      return sendResponse.success<TShare>(res, result.share, 200);
    }
    return sendResponse.success<{ action: 'already_shared' }>(
      res,
      { action: 'already_shared' },
      200,
    );
  } catch (error) {
    const classified = classifyPgError(error as Error);
    if (classified.pgCode === '23514') {
      return next(new AppError('Users cannot share their own posts', 422));
    }
    if (classified.pgCode === '23503') {
      return next(new AppError('Post not found', 404));
    }
    console.error('[sharesController] sharePost error:', error);
    next(error);
  }
};

/**
 * Remove the authenticated user's share of a post. Idempotent.
 * @route DELETE /api/shares/:post_id
 * @returns 200 with action 'unshared'; 401 if unauthenticated
 */
const unsharePost = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const post_id = req.params.post_id;

    const result = await share_model.unshare(user_id, post_id);

    return sendResponse.success<{ action: 'unshared' }>(res, result, 200);
  } catch (error) {
    console.error('[sharesController] unsharePost error:', error);
    next(error);
  }
};

/**
 * Retrieve a paginated list of users who shared a post, most-recent-first.
 * @route GET /api/shares/post/:post_id
 * @returns 200 with paginated sharers; 401 if unauthenticated
 */
const getPostSharers = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const post_id = req.params.post_id;

    const options = getCursorPaginationOptions(req);
    options.originalLimit = Math.min(options.originalLimit, 50);
    options.limit = options.originalLimit + 1;

    const sharers = await share_model.getSharesByPostId(
      post_id,
      options.limit,
      options.cursor,
      options.direction,
    );

    const result = createPaginationResult<TShareUser>(sharers, options, 'share_id');

    return sendResponse.success<IPaginatedResult<TShareUser>>(res, result, 200);
  } catch (error) {
    console.error('[sharesController] getPostSharers error:', error);
    next(error);
  }
};

/**
 * Check whether the authenticated user has shared a specific post.
 * @route GET /api/shares/is-shared/:post_id
 * @returns 200 with { isShared: boolean }; 401 if unauthenticated
 */
const checkShareStatus = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'UNAUTHENTICATED!', 401, 'USER ID IS REQUIRED!');
    }

    const post_id = req.params.post_id;

    const result = await share_model.isShared(user_id, post_id);

    return sendResponse.success<{ isShared: boolean }>(res, result, 200);
  } catch (error) {
    console.error('[sharesController] checkShareStatus error:', error);
    next(error);
  }
};

export default {
  sharePost,
  unsharePost,
  getPostSharers,
  checkShareStatus,
};
