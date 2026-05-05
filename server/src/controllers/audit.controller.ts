import { NextFunction, Response } from 'express';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { IPaginatedResult } from '../interfaces/IPagination.js';
import { TAuditRecord } from '../types/audit.js';
import { sendResponse } from '../utilities/response.js';
import { audit_model } from './factory.js';

/**
 * Query audit log with optional filters and cursor-based pagination.
 * @route GET /api/audit
 * @returns 200 with paginated audit records, 400 on validation failure
 */
const getAuditLogs = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const result: IPaginatedResult<TAuditRecord> = await audit_model.query({
      actor_id: req.query.actor_id as string | undefined,
      actor_type: req.query.actor_type as 'user' | 'system' | undefined,
      action: req.query.action as string | undefined,
      entity_type: req.query.entity_type as string | undefined,
      entity_id: req.query.entity_id as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      limit,
      cursor: req.query.cursor as string | undefined,
      direction: (req.query.direction as 'next' | 'previous') || 'next',
    });

    return sendResponse.success<IPaginatedResult<TAuditRecord>>(res, result, 200);
  } catch (error) {
    next(error);
  }
};

export default {
  getAuditLogs,
};
