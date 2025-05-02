import { NextFunction, Response } from "express";
import { validationResult } from "express-validator";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import {
  createPaginationResult,
  getCursorPaginationOptions,
} from "../utilities/pagination";
import { sendResponse } from "../utilities/response";
import { follow_model } from "./factory";

/**
 * Follow a user identified by user_id_followed in the request body.
 * @route POST /api/follows/follow
 */
const followUser = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, errors.array());
    }

    const user_id_following = req.user?.id;
    const user_id_followed = req.body.user_id_followed;

    if (!user_id_following) {
      return sendResponse.error(
        res,
        "UNAUTHENTICATED!",
        401,
        "USER ID FOLLOWING IS REQUIRED!"
      );
    }

    if (user_id_following === user_id_followed) {
      return sendResponse.error(
        res,
        "YOU CANNOT FOLLOW YOURSELF!",
        400,
        "YOU CANNOT FOLLOW YOURSELF!"
      );
    }
    const followAUser = await follow_model.follow(
      user_id_following,
      user_id_followed
    );
    return sendResponse.success(
      res,
      followAUser,
      "USER FOLLOWED SUCCESSFULLY!",
      201
    );
  } catch (error) {
    console.error("[followController] followUser error :", error);
    next(error);
  }
};

/**
 * Unfollow a user identified by user_id_followed in the request body.
 * @route DELETE /api/follows/unfollow
 */
const unFollowUser = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, error.array());
    }

    const user_id_following = req.user?.id;
    const user_id_followed = req.body.user_id_followed;

    if (!user_id_following) {
      return sendResponse.error(
        res,
        "UNAUTHENTICATED!",
        401,
        "USER ID FOLLOWING IS REQUIRED!"
      );
    }

    if (user_id_following === user_id_followed) {
      return sendResponse.error(
        res,
        "YOU CANNOT UNFOLLOW YOURSELF!",
        403,
        "YOU CANNOT UNFOLLOW YOURSELF!"
      );
    }
    const unFollowAUser = await follow_model.unFollow(
      user_id_following,
      user_id_followed
    );
    return sendResponse.success(
      res,
      unFollowAUser,
      "USER UNFOLLOWED SUCCESSFULLY!",
      201
    );
  } catch (error) {
    console.error("[followController] unFollowUser error :", error);
    next(error);
  }
};

/**
 * Get number of followings of a user identified by user_id in the request user.
 * @route GET /api/follows/num-followings
 */
const getNumberOfFollowings = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(
        res,
        "UNAUTHENTICATED!",
        401,
        "USER ID IS REQUIRED!"
      );
    }
    // get the followings from the database
    const numFollowings = await follow_model.getNumberOfFollowings(user_id);
    return sendResponse.success(
      res,
      numFollowings,
      "NUMBER OF FOLLOWINGS FETCHED SUCCESSFULLY!",
      200
    );
  } catch (error) {
    console.error("[followController] getNumberOfFollowings error :", error);
    next(error);
  }
};

/**
 * Get number of followers of a user identified by user_id in the request user.
 * @route GET /api/follows/num-followers
 */
const getNumberOfFollowers = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  const user_id = req.user?.id;
  try {
    if (!user_id) {
      return sendResponse.error(
        res,
        "UNAUTHENTICATED!",
        401,
        "USER ID IS REQUIRED!"
      );
    }
    const numFollowers = await follow_model.getNumberOfFollowers(user_id);
    return sendResponse.success(
      res,
      numFollowers,
      "NUMBER OF FOLLOWERS FETCHED SUCCESSFULLY!",
      200
    );
  } catch (error) {
    console.error("[followController] getNumberOfFollowers error :", error);
    next(error);
  }
};

/**
 * Get followings of a user identified by user_id in the request user.
 * @route GET /api/follows/followings
 */
const getFollowings = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(
        res,
        "UNAUTHENTICATED!",
        401,
        "USER ID IS REQUIRED!"
      );
    }

    const { limit, cursor, direction } = getCursorPaginationOptions(req);

    const { followings, totalCount } = await follow_model.getFollowings(
      user_id,
      limit,
      cursor,
      direction
    );

    const result = createPaginationResult(
      followings,
      { limit, cursor, direction },
      totalCount,
      "user_id"
    );

    return sendResponse.success(
      res,
      result,
      "FOLLOWINGS FETCHED SUCCESSFULLY!",
      200
    );
  } catch (error) {
    console.error("[followController] getFollowings error :", error);
    next(error);
  }
};

/**
 * Get followers of a user identified by user_id in the request user.
 * @route GET /api/follows/followers
 */
const getFollowers = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(
        res,
        "UNAUTHENTICATED!",
        401,
        "USER ID IS REQUIRED!"
      );
    }

    const { limit, cursor, direction } = getCursorPaginationOptions(req);

    const { followers, totalCount } = await follow_model.getFollowers(
      user_id,
      limit,
      cursor,
      direction
    );

    const result = createPaginationResult(
      followers,
      { limit, cursor, direction },
      totalCount,
      "user_id"
    );
    return sendResponse.success(
      res,
      result,
      "FOLLOWERS FETCHED SUCCESSFULLY!",
      200
    );
  } catch (error) {
    console.error("[followController] getFollowers error :", error);
    next(error);
  }
};

/**
 * Check if a user is following another user identified by user_id in the request user.
 * @route GET /api/follows/is-followed/:followed_id
 */
const isFollowed = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, error.array());
    }
    const following_id = req.user?.id;
    const followed_id = req.params.followed_id;
    if (!following_id) {
      return sendResponse.error(
        res,
        "UNAUTHORIZED!",
        401,
        "USER ID FOLLOWING IS REQUIRED!"
      );
    }
    const checkIsFollowed = await follow_model.checkIfFollowing(
      following_id,
      followed_id
    );
    return sendResponse.success(
      res,
      checkIsFollowed,
      "FOLLOW STATUS CHECKED SUCCESSFULLY!",
      200
    );
  } catch (error) {
    console.error("[followController] isFollowed error :", error);
    next(error);
  }
};

export default {
  followUser,
  unFollowUser,
  getNumberOfFollowings,
  getNumberOfFollowers,
  getFollowings,
  getFollowers,
  isFollowed,
};
