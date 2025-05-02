import { NextFunction, Response } from "express";
import { validationResult } from "express-validator";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import { Like } from "../types/like";
import { sendResponse } from "../utilities/response";
import { like_model } from "./factory";

/**
 * Handle like/unlike action for a post.
 * @route POST /api/posts/like/:post_id
 */
const handleLike = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, errors.array());
    }
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(
        res,
        "UNAUTHENTICATED!",
        401,
        "USER ID IS REQUIRED!"
      );
    }
    const like: Like = {
      user_id,
      post_id: req.params.post_id,
    };
    const isLiked = await like_model.like(like);
    return sendResponse.success(res, isLiked, "LIKE ADDED SUCCESSFULLY!", 200);
  } catch (error) {
    console.error("[likeController] handleLike error :", error);
    next(error);
  }
};

/**
 * Check if a user has liked a post.
 * @route GET /api/posts/is-liked/:post_id
 */
const checkIfLiked = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, errors.array());
    }

    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(
        res,
        "UNAUTHENTICATED!",
        401,
        "USER ID IS REQUIRED!"
      );
    }

    const post_id = req.params.post_id;

    const result = await like_model.checkIfLiked(user_id, post_id);
    return sendResponse.success(res, result, "LIKE CHECKED SUCCESSFULLY!", 200);
  } catch (error) {
    console.error("[likeController] checkIfLiked error :", error);
    next(error);
  }
};

export default {
  handleLike,
  checkIfLiked,
};
