import { PoolClient, QueryResult } from 'pg';
import pool from '../database/pool.js';
import { TargetType, TReport, TReportInput, ReportStatus } from '../types/report.js';

class ReportModel {
  private validateRequiredFields(fields: Record<string, unknown>, fieldNames: string[]): void {
    const missingFields = fieldNames.filter((name) => !fields[name]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')} are required`);
    }
  }

  /**
   * Check whether the reported target actually exists in the corresponding table.
   * @param targetType - one of 'post', 'comment', 'user'
   * @param targetId - UUID of the target to look up
   * @returns true if the target row exists
   */
  async targetExists(targetType: TargetType, targetId: string): Promise<boolean> {
    const tableMap: Record<TargetType, string> = {
      post: 'posts',
      comment: 'comments',
      user: 'users',
    };
    const idColumnMap: Record<TargetType, string> = {
      post: 'post_id',
      comment: 'comment_id',
      user: 'user_id',
    };

    const table = tableMap[targetType];
    const col = idColumnMap[targetType];

    const connection: PoolClient = await pool.connect();
    try {
      const sql = `SELECT 1 FROM ${table} WHERE ${col} = $1 LIMIT 1`;
      const result: QueryResult = await connection.query(sql, [targetId]);
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      throw new Error(`Target existence check failed: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get the owner user_id of a target entity (for self-report prevention).
   * @param targetType - one of 'post', 'comment', 'user'
   * @param targetId - UUID of the target
   * @returns the owner's user_id, or null if not found
   */
  async getTargetOwnerId(targetType: TargetType, targetId: string): Promise<string | null> {
    const connection: PoolClient = await pool.connect();
    try {
      let sql: string;
      if (targetType === 'post') {
        sql = 'SELECT user_id FROM posts WHERE post_id = $1';
      } else if (targetType === 'comment') {
        sql = 'SELECT user_id FROM comments WHERE comment_id = $1';
      } else {
        return targetId;
      }

      const result: QueryResult = await connection.query(sql, [targetId]);
      if (result.rowCount === 0) {
        return null;
      }
      return result.rows[0].user_id as string;
    } catch (error) {
      throw new Error(`Target owner lookup failed: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Insert a new report. DB UNIQUE constraint (23505) bubbles up for duplicate detection.
   * @param input - validated report input
   * @returns the created report row
   * @route POST /api/reports
   */
  async create(input: TReportInput): Promise<TReport> {
    this.validateRequiredFields(
      {
        reporter_id: input.reporter_id,
        target_type: input.target_type,
        target_id: input.target_id,
        reason: input.reason,
      },
      ['reporter_id', 'target_type', 'target_id', 'reason'],
    );

    const connection: PoolClient = await pool.connect();
    try {
      const sql = `
        INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING report_id, reporter_id, target_type, target_id, reason, description,
                  status, resolved_by, resolution_note, created_at, updated_at, resolved_at
      `;
      const result: QueryResult<TReport> = await connection.query(sql, [
        input.reporter_id,
        input.target_type,
        input.target_id,
        input.reason,
        input.description ?? null,
      ]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Report creation failed: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Fetch a single report by ID.
   * @param reportId - UUID of the report
   * @returns the report row or null
   */
  async getById(reportId: string): Promise<TReport | null> {
    const connection: PoolClient = await pool.connect();
    try {
      const sql = `
        SELECT report_id, reporter_id, target_type, target_id, reason, description,
               status, resolved_by, resolution_note, created_at, updated_at, resolved_at
        FROM reports
        WHERE report_id = $1
      `;
      const result: QueryResult<TReport> = await connection.query(sql, [reportId]);
      return result.rows[0] ?? null;
    } catch (error) {
      throw new Error(`Failed to get report: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * List reports with optional filters and offset pagination.
   * @param filters - optional status and targetType filters
   * @param limit - page size (default 20, max 100)
   * @param offset - skip count
   * @returns paginated report rows and total count
   */
  async list(
    filters: { status?: ReportStatus; targetType?: TargetType },
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ data: TReport[]; total: number }> {
    const connection: PoolClient = await pool.connect();
    try {
      const conditions: string[] = [];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }
      if (filters.targetType) {
        conditions.push(`target_type = $${paramIndex++}`);
        params.push(filters.targetType);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countSql = `SELECT COUNT(*) AS total FROM reports ${whereClause}`;
      const countResult: QueryResult<{ total: string }> = await connection.query(countSql, params);
      const total = parseInt(countResult.rows[0].total, 10);

      const dataSql = `
        SELECT report_id, reporter_id, target_type, target_id, reason, description,
               status, resolved_by, resolution_note, created_at, updated_at, resolved_at
        FROM reports
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      params.push(limit, offset);

      const dataResult: QueryResult<TReport> = await connection.query(dataSql, params);

      return { data: dataResult.rows, total };
    } catch (error) {
      throw new Error(`Failed to list reports: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Dismiss a pending report. Designed to be called within a caller-owned transaction.
   * @param client - the PoolClient from the caller's transaction
   * @param reportId - UUID of the report
   * @param resolvedBy - admin's user ID
   * @param resolutionNote - optional note
   * @returns updated report row, or null if report was not pending
   */
  async dismiss(
    client: PoolClient,
    reportId: string,
    resolvedBy: string,
    resolutionNote?: string,
  ): Promise<TReport | null> {
    const sql = `
      UPDATE reports
      SET status = 'dismissed',
          resolved_by = $2,
          resolution_note = $3,
          resolved_at = CURRENT_TIMESTAMP
      WHERE report_id = $1 AND status = 'pending'
      RETURNING report_id, reporter_id, target_type, target_id, reason, description,
                status, resolved_by, resolution_note, created_at, updated_at, resolved_at
    `;
    const result: QueryResult<TReport> = await client.query(sql, [
      reportId,
      resolvedBy,
      resolutionNote ?? null,
    ]);
    return result.rows[0] ?? null;
  }

  /**
   * Resolve a pending report. Designed to be called within a caller-owned transaction.
   * @param client - the PoolClient from the caller's transaction
   * @param reportId - UUID of the report
   * @param resolvedBy - admin's user ID
   * @param resolutionNote - optional note
   * @returns updated report row, or null if report was not pending
   */
  async resolve(
    client: PoolClient,
    reportId: string,
    resolvedBy: string,
    resolutionNote?: string,
  ): Promise<TReport | null> {
    const sql = `
      UPDATE reports
      SET status = 'resolved',
          resolved_by = $2,
          resolution_note = $3,
          resolved_at = CURRENT_TIMESTAMP
      WHERE report_id = $1 AND status = 'pending'
      RETURNING report_id, reporter_id, target_type, target_id, reason, description,
                status, resolved_by, resolution_note, created_at, updated_at, resolved_at
    `;
    const result: QueryResult<TReport> = await client.query(sql, [
      reportId,
      resolvedBy,
      resolutionNote ?? null,
    ]);
    return result.rows[0] ?? null;
  }

  /**
   * Count reports grouped by status for admin dashboard.
   * @returns counts keyed by status
   */
  async countByStatus(): Promise<Record<ReportStatus, number>> {
    const connection: PoolClient = await pool.connect();
    try {
      const sql = `
        SELECT status, COUNT(*)::int AS count
        FROM reports
        GROUP BY status
      `;
      const result: QueryResult<{ status: ReportStatus; count: number }> =
        await connection.query(sql);

      const counts: Record<ReportStatus, number> = {
        pending: 0,
        dismissed: 0,
        resolved: 0,
      };

      for (const row of result.rows) {
        counts[row.status] = row.count;
      }

      return counts;
    } catch (error) {
      throw new Error(`Failed to count reports by status: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }
}

export default ReportModel;
