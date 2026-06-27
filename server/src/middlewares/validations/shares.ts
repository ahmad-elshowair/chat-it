import { body, param } from 'express-validator';

// ───── SHARE ACTION (param-only) ──────────────────────────────
export const validateShare = [
  param('post_id')
    .notEmpty()
    .withMessage('Post ID is required')
    .isUUID()
    .withMessage('Post ID must be a valid UUID'),
];

// ───── SHARE CREATION (param + optional commentary) ──────────────────────────────
export const validateShareCreation = [
  param('post_id')
    .notEmpty()
    .withMessage('Post ID is required')
    .isUUID()
    .withMessage('Post ID must be a valid UUID'),
  body('commentary')
    .optional()
    .isString()
    .withMessage('Commentary must be a string')
    .isLength({ max: 280 })
    .withMessage('Commentary must be at most 280 characters')
    .customSanitizer((value) => {
      if (typeof value !== 'string') {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    }),
];
