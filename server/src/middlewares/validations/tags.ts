import { param, query } from 'express-validator';

export const tagNameValidator = [
  param('name')
    .matches(/^[a-z0-9_]{2,50}$/)
    .withMessage(
      'Tag name must contain only lowercase alphanumeric characters and underscores (2-50 chars)',
    ),
];

export const tagSearchValidator = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ max: 50 })
    .withMessage('Search query must be at most 50 characters'),
];

export const tagPaginationValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be an integer between 1 and 50')
    .toInt(),

  query('cursor').optional().isString().withMessage('Cursor must be a string'),

  query('direction')
    .optional()
    .isIn(['next', 'previous'])
    .withMessage("Direction must be 'next' or 'previous'"),
];

export const trendingValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be an integer between 1 and 50')
    .toInt(),
];
