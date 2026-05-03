import { body, param, query } from 'express-validator';

export const validateCreateReport = [
  body('target_type')
    .notEmpty()
    .withMessage('target_type is required')
    .isIn(['post', 'comment', 'user'])
    .withMessage('target_type must be one of: post, comment, user'),

  body('target_id')
    .notEmpty()
    .withMessage('target_id is required')
    .isUUID()
    .withMessage('target_id must be a valid UUID'),

  body('reason')
    .notEmpty()
    .withMessage('reason is required')
    .isIn(['spam', 'harassment', 'hate_speech', 'inappropriate_content', 'impersonation', 'other'])
    .withMessage('reason must be a valid category'),

  body('description')
    .optional()
    .isString()
    .withMessage('description must be a string')
    .isLength({ max: 1000 })
    .withMessage('description must be at most 1000 characters'),
];

export const validateReportId = [
  param('id')
    .notEmpty()
    .withMessage('Report ID is required')
    .isUUID()
    .withMessage('Report ID must be a valid UUID'),
];

export const validateResolutionNote = [
  body('resolution_note')
    .optional()
    .isString()
    .withMessage('resolution_note must be a string')
    .isLength({ max: 2000 })
    .withMessage('resolution_note must be at most 2000 characters'),
];

export const validateReportListQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'dismissed', 'resolved'])
    .withMessage('status must be one of: pending, dismissed, resolved'),

  query('targetType')
    .optional()
    .isIn(['post', 'comment', 'user'])
    .withMessage('targetType must be one of: post, comment, user'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100')
    .toInt(),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer')
    .toInt(),
];
