import { query } from 'express-validator';

export const validateSearch = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Search query must be between 2 and 200 characters'),

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
