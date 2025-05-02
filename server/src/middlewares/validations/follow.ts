import { param } from "express-validator";

const validateUUID = (field: string, message: string) =>
  param(field)
    .notEmpty()
    .withMessage(`${message} is required`)
    .isUUID()
    .withMessage(`${message} must be valid UUID`);

export const validateFollowAction = [
  validateUUID("user_id_followed", "User ID followed"),
];

export const validateIsFollowedAction = [
  validateUUID("followed_id", "Followed ID"),
];
