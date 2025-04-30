import { body } from "express-validator";

export const createCommentValidator = [
  body("post_id")
    .notEmpty()
    .withMessage("Post ID is required")
    .isUUID()
    .withMessage("Post ID must be a valid UUID"),
  body("content")
    .notEmpty()
    .withMessage("Comment Content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment Content must be between 1 and 500 characters"),
  body("parent_comment_id")
    .optional()
    .isUUID()
    .withMessage("Parent Comment ID must be a valid UUID"),
];

export const updateCommentValidator = [
  body("comment_id")
    .notEmpty()
    .withMessage("Comment ID is required")
    .isUUID()
    .withMessage("Comment ID must be a valid UUID"),
  body("content")
    .notEmpty()
    .withMessage("Comment Content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment Content must be between 1 and 500 characters"),
];

export const deleteCommentValidator = [
  body("comment_id")
    .notEmpty()
    .withMessage("Comment ID is required")
    .isUUID()
    .withMessage("Comment ID must be a valid UUID"),
];

export const getCommentsByPostIdValidator = [
  body("post_id")
    .notEmpty()
    .withMessage("Post ID is required")
    .isUUID()
    .withMessage("Post ID must be a valid UUID"),
];

export const getRepliesByCommentIdValidator = [
  body("comment_id")
    .notEmpty()
    .withMessage("Comment ID is required")
    .isUUID()
    .withMessage("Comment ID must be a valid UUID"),
];
