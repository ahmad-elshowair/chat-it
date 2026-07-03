import { PoolClient, QueryResult } from 'pg';
import pool from '../database/pool.js';
import { TShare, TShareUser } from '../types/share.js';

class ShareModel {
  /**
   * Validate required fields for a share action.
   * @param fields - key-value map of fields to validate
   * @param fieldsNames - names of required fields
   * @throws {Error} if any required fields are missing
   */
  private validateRequiredFields(fields: Record<string, unknown>, fieldsNames: string[]): void {
    const missingFields = fieldsNames.filter((fieldName) => !fields[fieldName]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')} are required`);
    }
  }

  /**
   * Create a share (simple repost or quote post). Idempotent via ON CONFLICT DO NOTHING.
   * The number_of_shares counter is maintained by the AFTER INSERT trigger — this method
   * MUST NOT update it (doing so double-counts).
   * @param userId - the authenticated user's ID (sharer)
   * @param postId - the post being shared
   * @param commentary - optional quote commentary (≤ 280 chars, already normalized to null if blank)
   * @returns the created share on insert (rowCount 1), or an already_shared indicator on duplicate (rowCount 0)
   * @throws {Error} on FK violation (23503, post missing) or self-share (23514, trigger) — bubbles to global handler
   */
  async share(
    userId: string,
    postId: string,
    commentary: string | null,
  ): Promise<{ share: TShare | null; action: 'shared' | 'already_shared' }> {
    this.validateRequiredFields({ user_id: userId, post_id: postId }, ['user_id', 'post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const sql = `
        INSERT INTO shares (user_id, original_post_id, commentary)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, original_post_id) DO NOTHING
        RETURNING share_id, user_id, original_post_id, commentary, created_at
      `;
      const result: QueryResult<TShare> = await connection.query(sql, [userId, postId, commentary]);

      await connection.query('COMMIT');

      if (result.rowCount === 1) {
        return { share: result.rows[0], action: 'shared' };
      }
      return { share: null, action: 'already_shared' };
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`share model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Remove the authenticated user's share of a post. Idempotent — a no-op if no share existed.
   * The counter decrement is handled by the AFTER DELETE trigger (also fires on cascade deletes).
   * @param userId - the authenticated user's ID
   * @param postId - the post being unshared
   * @returns action confirmation
   */
  async unshare(userId: string, postId: string): Promise<{ action: 'unshared' }> {
    this.validateRequiredFields({ user_id: userId, post_id: postId }, ['user_id', 'post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const sql = `
        DELETE FROM shares
        WHERE user_id = $1 AND original_post_id = $2
      `;
      await connection.query(sql, [userId, postId]);

      await connection.query('COMMIT');
      return { action: 'unshared' };
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`unshare model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Get paginated sharers of a post, ordered most-recent-first.
   * @param postId - the post whose sharers are requested
   * @param limit - max results per page (already +1 for has_more detection)
   * @param cursor - share_id of the last item from the previous page
   * @param direction - pagination direction
   * @returns sharer rows (user details + shared_at)
   */
  async getSharesByPostId(
    postId: string,
    limit: number = 20,
    cursor?: string,
    direction: 'next' | 'previous' = 'next',
  ): Promise<TShareUser[]> {
    this.validateRequiredFields({ post_id: postId }, ['post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');
      const params: (string | number)[] = [postId];

      let sql = `
        SELECT
          s.share_id,
          s.user_id,
          u.user_name,
          u.first_name,
          u.last_name,
          u.picture,
          s.created_at AS shared_at
        FROM
          shares s
        JOIN
          users u ON u.user_id = s.user_id
        WHERE
          s.original_post_id = $1
      `;

      if (cursor) {
        const cursorCheck = await connection.query(
          `SELECT created_at FROM shares WHERE share_id = $1`,
          [cursor],
        );

        if (cursorCheck.rows.length > 0) {
          const timestamp = cursorCheck.rows[0].created_at;
          if (direction === 'next') {
            sql += ` AND s.created_at < $2`;
          } else {
            sql += ` AND s.created_at > $2`;
          }
          params.push(timestamp);
        } else {
          console.warn(`Share with ID ${cursor} not found for pagination`);
        }
      }

      sql +=
        direction === 'next'
          ? ' ORDER BY s.created_at DESC, s.share_id DESC'
          : ' ORDER BY s.created_at ASC, s.share_id ASC';

      sql += ` LIMIT $${params.length + 1}`;
      params.push(limit);

      const result: QueryResult<TShareUser> = await connection.query(sql, params);

      await connection.query('COMMIT');
      return direction === 'previous' ? result.rows.reverse() : result.rows;
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('[SHARE MODEL] getSharesByPostId error', error);
      throw new Error(`Failed to get shares by post id: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Check whether the authenticated user has shared a given post.
   * @param userId - the authenticated user's ID
   * @param postId - the post to check
   * @returns whether the user has shared the post
   */
  async isShared(userId: string, postId: string): Promise<{ isShared: boolean }> {
    this.validateRequiredFields({ user_id: userId, post_id: postId }, ['user_id', 'post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      const sql = `
        SELECT 1
        FROM shares
        WHERE user_id = $1 AND original_post_id = $2
      `;
      const result: QueryResult = await connection.query(sql, [userId, postId]);

      return { isShared: result.rows.length > 0 };
    } catch (error) {
      console.error('[SHARE MODEL] isShared error', error);
      throw new Error(`Failed to check share: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }
}

export default ShareModel;
