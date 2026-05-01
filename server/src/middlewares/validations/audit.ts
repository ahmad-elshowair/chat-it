import { query } from 'express-validator';

export const auditQueryValidator = [
  query('actor_id').optional().isUUID().withMessage('actor_id must be a valid UUID'),

  query('actor_type')
    .optional()
    .isIn(['user', 'system'])
    .withMessage("actor_type must be 'user' or 'system'"),

  query('action')
    .optional()
    .isString()
    .withMessage('action must be a string')
    .isLength({ max: 100 })
    .withMessage('action must be at most 100 characters'),

  query('entity_type')
    .optional()
    .isString()
    .withMessage('entity_type must be a string')
    .isLength({ max: 50 })
    .withMessage('entity_type must be at most 50 characters'),

  query('entity_id').optional().isString().withMessage('entity_id must be a string'),

  query('from').optional().isISO8601().withMessage('from must be a valid ISO 8601 datetime'),

  query('to').optional().isISO8601().withMessage('to must be a valid ISO 8601 datetime'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100')
    .toInt(),

  query('cursor').optional().isUUID().withMessage('cursor must be a valid UUID'),

  query('direction')
    .optional()
    .isIn(['next', 'previous'])
    .withMessage("Direction must be 'next' or 'previous'"),
];
