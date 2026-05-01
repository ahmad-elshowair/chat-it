import { PoolClient, QueryResult } from 'pg';
import pool from '../database/pool.js';
import { TAuditEmitParams, TAuditQueryParams, TAuditRecord } from '../types/audit.js';
import { IPaginatedResult } from '../interfaces/IPagination.js';

const MAX_JSON_BYTES = 10240;

class AuditModel {
  /**
   * Truncate a JSON payload to fit within the byte limit.
   * Removes keys from the end and adds a `_truncated` marker.
   */
  private truncateJsonPayload(
    payload: Record<string, unknown>,
    byteLimit: number,
  ): Record<string, unknown> {
    const entries = Object.entries(payload);
    let result: Record<string, unknown> = { ...payload };

    for (let i = entries.length - 1; i >= 0; i--) {
      if (Buffer.byteLength(JSON.stringify(result), 'utf-8') <= byteLimit) {
        return result;
      }
      result = {};
      for (let j = 0; j < i; j++) {
        result[entries[j][0]] = entries[j][1];
      }
      result._truncated = true;
    }

    return result;
  }

  /**
   * INSERT an audit record using the provided client (joins caller's transaction).
   * Validates required fields and truncates oversized JSON payloads.
   * @param client - the database client from the caller's transaction
   * @param params - audit event parameters
   * @returns the inserted audit record
   * @throws {Error} if required fields are empty or both previousValues/newValues are null
   */
  async record(client: PoolClient, params: TAuditEmitParams): Promise<TAuditRecord> {
    const {
      actorId,
      actorType,
      action,
      entityType,
      entityId,
      previousValues,
      newValues,
      ipAddress,
    } = params;

    if (!action || !entityType || !entityId || !actorId) {
      throw new Error('Audit record requires non-empty action, entityType, entityId, and actorId');
    }

    if (previousValues === null && newValues === null) {
      throw new Error('At least one of previousValues or newValues must be non-null');
    }

    let prevJson = previousValues;
    let newJson = newValues;

    if (prevJson && Buffer.byteLength(JSON.stringify(prevJson), 'utf-8') > MAX_JSON_BYTES) {
      prevJson = this.truncateJsonPayload(prevJson, MAX_JSON_BYTES);
    }

    if (newJson && Buffer.byteLength(JSON.stringify(newJson), 'utf-8') > MAX_JSON_BYTES) {
      newJson = this.truncateJsonPayload(newJson, MAX_JSON_BYTES);
    }

    const result: QueryResult<TAuditRecord> = await client.query(
      `INSERT INTO audit_log (actor_id, actor_type, action, entity_type, entity_id, previous_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet)
       RETURNING id, actor_id, actor_type, action, entity_type, entity_id, previous_values, new_values, ip_address, created_at`,
      [
        actorId,
        actorType,
        action,
        entityType,
        entityId,
        prevJson ? JSON.stringify(prevJson) : null,
        newJson ? JSON.stringify(newJson) : null,
        ipAddress ?? null,
      ],
    );

    return result.rows[0];
  }

  /**
   * Query audit records with optional filters and cursor-based pagination.
   * Uses parameterized IS NULL OR pattern for dynamic WHERE.
   * Compound cursor via UUID subquery — caller passes a single UUID string.
   * @param params - query filters and pagination options
   * @returns paginated audit records
   */
  async query(params: TAuditQueryParams): Promise<IPaginatedResult<TAuditRecord>> {
    const {
      actor_id,
      actor_type,
      action,
      entity_type,
      entity_id,
      from,
      to,
      limit = 20,
      cursor,
      direction = 'next',
    } = params;

    const effectiveLimit = limit + 1;
    const queryParams: (string | number | null)[] = [
      from ?? null,
      to ?? null,
      actor_id ?? null,
      actor_type ?? null,
      action ?? null,
      entity_type ?? null,
      entity_id ?? null,
      cursor ?? null,
      effectiveLimit,
    ];

    let orderBy = 'created_at DESC, id DESC';
    let cursorCondition =
      'AND ($8::uuid IS NULL OR (created_at, id) < (SELECT created_at, id FROM audit_log WHERE id = $8))';

    if (direction === 'previous') {
      orderBy = 'created_at ASC, id ASC';
      cursorCondition =
        'AND ($8::uuid IS NULL OR (created_at, id) > (SELECT created_at, id FROM audit_log WHERE id = $8))';
    }

    const sql = `
      SELECT id, actor_id, actor_type, action, entity_type, entity_id, previous_values, new_values, ip_address, created_at
      FROM audit_log
      WHERE ($1::timestamptz IS NULL OR created_at >= $1)
        AND ($2::timestamptz IS NULL OR created_at <= $2)
        AND ($3::text IS NULL OR actor_id = $3)
        AND ($4::text IS NULL OR actor_type = $4)
        AND ($5::text IS NULL OR action = $5)
        AND ($6::text IS NULL OR entity_type = $6)
        AND ($7::text IS NULL OR entity_id = $7)
        ${cursorCondition}
      ORDER BY ${orderBy}
      LIMIT $9
    `;

    const connection: PoolClient = await pool.connect();
    try {
      const result: QueryResult<TAuditRecord> = await connection.query(sql, queryParams);

      let rows = result.rows;
      const hasMore = rows.length > limit;
      if (hasMore) {
        rows = rows.slice(0, limit);
      }

      if (direction === 'previous') {
        rows = rows.reverse();
      }

      const lastItem = rows[rows.length - 1];
      const firstItem = rows[0];

      return {
        data: rows,
        pagination: {
          hasMore,
          nextCursor: hasMore && lastItem ? lastItem.id : undefined,
          previousCursor: firstItem ? firstItem.id : undefined,
        },
      };
    } catch (error) {
      throw new Error(`Failed to query audit log: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }
}

export default AuditModel;
