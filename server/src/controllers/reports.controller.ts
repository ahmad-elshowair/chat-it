import { NextFunction, Response } from 'express';
import pool from '../database/pool.js';
import { emitAudit } from '../services/auditEmitter.js';
import { report_model } from './factory.js';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { AppError } from '../utilities/appError.js';
import { sendResponse } from '../utilities/response.js';
import { TargetType, ReportStatus } from '../types/report.js';

/**
 * Create a new report against a post, comment, or user profile.
 * Validates target existence and prevents self-reporting.
 * @route POST /api/reports
 * @returns 201 with created report, 403 on self-report, 404 if target not found, 409 on duplicate
 */
const createReport = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { target_type, target_id, reason, description } = req.body;
    const reporterId = req.user?.id;

    if (!reporterId) {
      return sendResponse.error(res, 'Authentication required', 401);
    }

    const exists = await report_model.targetExists(target_type as TargetType, target_id as string);
    if (!exists) {
      return sendResponse.error(res, 'Target not found', 404);
    }

    const ownerId = await report_model.getTargetOwnerId(
      target_type as TargetType,
      target_id as string,
    );
    if (ownerId === reporterId) {
      return sendResponse.error(res, 'You cannot report your own content', 403);
    }

    const report = await report_model.create({
      reporter_id: reporterId,
      target_type,
      target_id,
      reason,
      description,
    });

    return sendResponse.success(res, report, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * List reports with optional filters and offset pagination (admin/moderator only).
 * @route GET /api/reports
 * @returns 200 with paginated report list
 */
const listReports = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as ReportStatus | undefined;
    const targetType = req.query.targetType as TargetType | undefined;
    const limit = (req.query.limit as number | undefined) ?? 20;
    const offset = (req.query.offset as number | undefined) ?? 0;

    const result = await report_model.list({ status, targetType }, limit, offset);

    return sendResponse.success(res, result, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Dismiss a pending report with an optional resolution note.
 * @route PATCH /api/reports/:id/dismiss
 * @returns 200 with updated report, 404 if not found, 409 if not pending
 */
const dismissReport = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { resolution_note } = req.body;
    const actorId = req.user?.id;

    if (!actorId) {
      return sendResponse.error(res, 'Authentication required', 401);
    }

    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const report = await report_model.dismiss(connection, id, actorId, resolution_note);

      if (!report) {
        await connection.query('ROLLBACK');
        const existing = await report_model.getById(id);
        if (!existing) {
          return next(new AppError('Report not found', 404));
        }
        return next(new AppError('Report is no longer pending', 409));
      }

      await emitAudit({
        client: connection,
        actorId,
        actorType: 'user',
        action: 'report.dismiss',
        entityType: 'report',
        entityId: id,
        previousValues: { status: 'pending' },
        newValues: { status: 'dismissed', resolution_note: resolution_note ?? null },
        ipAddress: req.ip,
      });

      await connection.query('COMMIT');
      return sendResponse.success(res, report, 200);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve a pending report with an optional resolution note. Flag-only in V1.
 * @route PATCH /api/reports/:id/resolve
 * @returns 200 with updated report, 404 if not found, 409 if not pending
 */
const resolveReport = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { resolution_note } = req.body;
    const actorId = req.user?.id;

    if (!actorId) {
      return sendResponse.error(res, 'Authentication required', 401);
    }

    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const report = await report_model.resolve(connection, id, actorId, resolution_note);

      if (!report) {
        await connection.query('ROLLBACK');
        const existing = await report_model.getById(id);
        if (!existing) {
          return next(new AppError('Report not found', 404));
        }
        return next(new AppError('Report is no longer pending', 409));
      }

      await emitAudit({
        client: connection,
        actorId,
        actorType: 'user',
        action: 'report.resolve',
        entityType: 'report',
        entityId: id,
        previousValues: { status: 'pending' },
        newValues: { status: 'resolved', resolution_note: resolution_note ?? null },
        ipAddress: req.ip,
      });

      await connection.query('COMMIT');
      return sendResponse.success(res, report, 200);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get aggregate report counts grouped by status.
 * @route GET /api/reports/stats
 * @returns 200 with { pending, dismissed, resolved } counts
 */
const getReportStats = async (_req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const counts = await report_model.countByStatus();
    return sendResponse.success(res, counts, 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createReport,
  listReports,
  dismissReport,
  resolveReport,
  getReportStats,
};
