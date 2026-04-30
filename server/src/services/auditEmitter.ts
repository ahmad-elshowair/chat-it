import pool from '../database/pool.js';
import AuditModel from '../models/audit.js';
import { TAuditEmitParams } from '../types/audit.js';

const auditModel = new AuditModel();

/**
 * Record an audit event. Joins the caller's transaction if a client is provided,
 * otherwise opens its own transaction.
 * @param params - audit event parameters with optional database client
 */
async function emitAudit(params: TAuditEmitParams): Promise<void> {
  if (params.client) {
    await auditModel.record(params.client, params);
    return;
  }

  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    await auditModel.record(connection, params);
    await connection.query('COMMIT');
  } catch (error) {
    await connection.query('ROLLBACK');
    throw new Error(`Failed to emit audit event: ${(error as Error).message}`, { cause: error });
  } finally {
    connection.release();
  }
}

export { emitAudit };
