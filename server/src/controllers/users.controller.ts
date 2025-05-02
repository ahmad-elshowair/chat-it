import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import {
  createPaginationResult,
  getCursorPaginationOptions,
} from "../utilities/pagination";
import { sendResponse } from "../utilities/response";
import { user_model } from "./factory";

/**
 * Get all users with pagination
 * @param req
 * @param res
 */
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { limit, cursor, direction } = getCursorPaginationOptions(req);
  const { users, totalCount } = await user_model.indexWithPagination(
    limit,
    cursor!,
    direction
  );

  const result = createPaginationResult(
    users,
    { limit, cursor, direction },
    totalCount,
    "user_id"
  );

  return sendResponse.success(res, result, "USERS FETCHED SUCCESSFULLY!");
};

/**
 * Get a user by user name
 * @param req
 * @param res
 */
const getUserByUsername = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, error.array());
    }
    const { user_name } = req.params;
    const user = await user_model.getUserByUsername(user_name);
    return sendResponse.success(res, user, "USER FETCHED SUCCESSFULLY!");
  } catch (error) {
    console.error("[USER CONTROLLER] getUserByUsername error: ", error);
    next(error);
  }
};

/**
 * Get a user by id
 * @param req
 * @param res
 * @param next
 */
// get a user by id
const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, error.array());
    }
    const { user_id } = req.params;
    const user = await user_model.getUserById(user_id);
    return sendResponse.success(res, user, "USER FETCHED SUCCESSFULLY!");
  } catch (error) {
    console.error("[USER CONTROLLER] getUserById error: ", error);
    next(error);
  }
};

/**
 * Update user profile
 * @param req
 * @param res
 * @param next
 */
const update = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, error.array());
    }
    const { user_id } = req.params;
    const userData = req.body;

    const logged_in_user_id = req.user?.id;
    if (!logged_in_user_id) {
      return sendResponse.error(res, "UNAUTHENTICATED", 401);
    }

    if (logged_in_user_id !== user_id) {
      return sendResponse.error(
        res,
        "You are not authorized to update this user",
        403
      );
    }
    const updated_user = await user_model.update(user_id, userData);
    return sendResponse.success(
      res,
      updated_user,
      "USER PROFILE UPDATED SUCCESSFULLY!"
    );
  } catch (error) {
    console.error("[USER CONTROLLER] update error: ", error);
    next(error);
  }
};

/**
 * Delete a user
 * @param req
 * @param res
 * @param next
 */
const deleteUser = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, error.array());
    }
    const { user_id } = req.params;
    const logged_in_user_id = req.user?.id;

    if (!logged_in_user_id) {
      return sendResponse.error(res, "UNAUTHENTICATED", 401);
    }

    if (logged_in_user_id !== user_id) {
      return sendResponse.error(
        res,
        "You are not authorized to delete this user",
        403
      );
    }
    const deleted_user = await user_model.delete(user_id);
    return sendResponse.success(
      res,
      deleted_user,
      "USER DELETED SUCCESSFULLY!"
    );
  } catch (error) {
    console.error("[USER CONTROLLER] delete error: ", error);
    next(error);
  }
};

/**
 * Get unknown users (users not followed)
 * @param req
 * @param res
 * @param next
 */
const getUnknownUsers = async (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  const user_id = req.user?.id;

  if (!user_id) {
    return sendResponse.error(res, "User ID is required", 400);
  }
  try {
    const unknowns = await user_model.getUnknowns(user_id);
    return sendResponse.success(
      res,
      unknowns,
      "UNKNOWN USERS FETCHED SUCCESSFULLY!"
    );
  } catch (error) {
    console.error("[USER CONTROLLER] getUnknownUsers error: ", error);
    next(error);
  }
};

/**
 * Get user's friends (mutual followers)
 * @param req
 * @param res
 * @param next
 */
const getFriends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const error = validationResult(req);
    if (!error.isEmpty()) {
      return sendResponse.error(res, "VALIDATION ERROR!", 400, error.array());
    }
    const user_id = req.params.user_id;
    const isOnline = req.query.is_online === "true";

    const { limit, cursor, direction } = getCursorPaginationOptions(req);
    const { users, totalCount } = await user_model.getFriends(
      user_id,
      isOnline,
      limit,
      cursor,
      direction
    );
    const result = createPaginationResult(
      users,
      { limit, cursor, direction },
      totalCount,
      "user_id"
    );
    return sendResponse.success(res, result, "FRIENDS FETCHED SUCCESSFULLY!");
  } catch (error) {
    console.error("[USER CONTROLLER] getFriends error: ", error);
    next(error);
  }
};

export default {
  getUsers,
  update,
  getUserById,
  getUserByUsername,
  deleteUser,
  getUnknownUsers,
  getFriends,
};
