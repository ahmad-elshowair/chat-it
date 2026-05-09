import { PoolClient, QueryResult } from 'pg';
import pool from '../database/pool.js';
import { IFeedPost } from '../interfaces/IPost.js';

const TAGS_SUBQUERY = `
  (
    SELECT COALESCE(json_agg(t2.name), '[]'::json)
    FROM post_tags pt2
    JOIN tags t2 ON t2.tag_id = pt2.tag_id
    WHERE pt2.post_id = p.post_id
  ) AS tags
`;

class TagModel {
  /**
   * Find or create a tag by name. Race-condition-safe via CTE upsert.
   * @param name - lowercase tag name
   * @param connection - optional caller-owned transaction client
   * @returns tag_id of the existing or newly created tag
   */
  async findOrCreate(name: string, connection?: PoolClient): Promise<string> {
    const client = connection || (await pool.connect());
    try {
      const sql = `
        WITH ins AS (
          INSERT INTO tags (name)
          VALUES ($1)
          ON CONFLICT (name) DO NOTHING
          RETURNING tag_id
        )
        SELECT tag_id FROM ins
        UNION ALL
        SELECT tag_id FROM tags WHERE name = $1
        LIMIT 1
      `;
      const result: QueryResult<{ tag_id: string }> = await client.query(sql, [name]);
      return result.rows[0].tag_id;
    } catch (error) {
      throw new Error(`findOrCreate tag: ${(error as Error).message}`, { cause: error });
    } finally {
      if (!connection) (client as PoolClient).release();
    }
  }

  /**
   * Synchronize tags for a post using set-diff reconciliation.
   * Computes toRemove = current - new, toAdd = new - current.
   * If identical sets, returns early with zero DB writes.
   * All counter updates occur in the same transaction.
   */
  async syncPostTags(
    postId: string,
    tagNames: string[],
    connection: PoolClient,
  ): Promise<void> {
    const currentResult = await connection.query(
      `SELECT t.name, t.tag_id FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = $1`,
      [postId],
    );

    const currentMap = new Map<string, string>();
    for (const row of currentResult.rows) {
      currentMap.set(row.name, row.tag_id);
    }

    const newSet = new Set(tagNames);
    const currentSet = new Set(currentMap.keys());

    const toRemove = [...currentSet].filter((n) => !newSet.has(n));
    const toAdd = [...newSet].filter((n) => !currentSet.has(n));

    if (toRemove.length === 0 && toAdd.length === 0) return;

    for (const name of toRemove) {
      const tagId = currentMap.get(name)!;
      await connection.query(`DELETE FROM post_tags WHERE post_id = $1 AND tag_id = $2`, [
        postId,
        tagId,
      ]);
      await connection.query(
        `UPDATE tags SET post_count = post_count - 1 WHERE tag_id = $1`,
        [tagId],
      );
    }

    for (const name of toAdd) {
      const tagId = await this.findOrCreate(name, connection);
      await connection.query(
        `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [postId, tagId],
      );
      await connection.query(
        `UPDATE tags SET post_count = post_count + 1 WHERE tag_id = $1`,
        [tagId],
      );
    }
  }

  /**
   * Decrement post_count for a tag. Protected by chk_tags_post_count >= 0.
   */
  async decrementPostCount(tagId: string, connection: PoolClient): Promise<void> {
    await connection.query(`UPDATE tags SET post_count = post_count - 1 WHERE tag_id = $1`, [
      tagId,
    ]);
  }

  /**
   * Get paginated posts by tag name. Returns IFeedPost shape.
   * When userId is provided, includes is_liked and is_bookmarked state.
   */
  async getPostsByTag(
    name: string,
    userId?: string,
    limit: number = 11,
    cursor?: string,
    direction: 'next' | 'previous' = 'next',
  ): Promise<IFeedPost[]> {
    const connection = await pool.connect();
    try {
      const params: (string | number)[] = [name];
      let paramIdx = 2;

      let likeJoin = '';
      let bookmarkJoin = '';
      let extraSelects = '';

      if (userId) {
        params.push(userId);
        const uidParam = `$${paramIdx}`;
        paramIdx++;
        likeJoin = `LEFT JOIN likes l ON l.post_id = p.post_id AND l.user_id = ${uidParam}`;
        bookmarkJoin = `LEFT JOIN bookmarks b ON b.post_id = p.post_id AND b.user_id = ${uidParam}`;
        extraSelects = `,
      CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END AS is_liked,
      CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END AS is_bookmarked`;
      } else {
        extraSelects = `,
      false AS is_liked,
      false AS is_bookmarked`;
      }

      let cursorCondition = '';
      if (cursor) {
        params.push(cursor);
        if (direction === 'next') {
          cursorCondition = ` AND p.updated_at < (SELECT updated_at FROM posts WHERE post_id = $${paramIdx})`;
        } else {
          cursorCondition = ` AND p.updated_at > (SELECT updated_at FROM posts WHERE post_id = $${paramIdx})`;
        }
        paramIdx++;
      }

      const orderDirection = direction === 'next' ? 'DESC' : 'ASC';

      const sql = `
        SELECT
          p.post_id, p.description, p.updated_at, p.image, p.number_of_likes,
          p.number_of_comments,
          u.user_id, u.user_name, u.picture, u.first_name, u.last_name${extraSelects},
          ${TAGS_SUBQUERY}
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        JOIN post_tags pt ON pt.post_id = p.post_id
        JOIN tags t ON t.tag_id = pt.tag_id
        ${likeJoin}
        ${bookmarkJoin}
        WHERE t.name = $1${cursorCondition}
        ORDER BY p.updated_at ${orderDirection}, p.post_id ${orderDirection}
        LIMIT $${paramIdx}
      `;
      params.push(limit);

      const result: QueryResult<IFeedPost> = await connection.query(sql, params);
      return direction === 'previous' ? result.rows.reverse() : result.rows;
    } catch (error) {
      throw new Error(`getPostsByTag: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Get trending tags ranked by recent activity within a configurable time window.
   * Returns max 20 tags; returns empty list when no activity.
   */
  async getTrending(windowHours: number, limit: number = 20): Promise<unknown[]> {
    const connection = await pool.connect();
    try {
      const sql = `
        SELECT
          t.tag_id,
          t.name,
          t.post_count,
          COUNT(pt.post_id)::int AS recent_count
        FROM tags t
        JOIN post_tags pt ON pt.tag_id = t.tag_id
        WHERE pt.created_at > NOW() - make_interval(hours => $1)
        GROUP BY t.tag_id, t.name, t.post_count
        ORDER BY recent_count DESC, t.post_count DESC
        LIMIT $2
      `;
      const result = await connection.query(sql, [windowHours, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`getTrending: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Search tags by name using pg_trgm trigram similarity.
   * Lowers similarity threshold to 0.1 for short query matching.
   * Max 20 results ranked by post_count DESC.
   */
  async search(query: string, limit: number = 20): Promise<unknown[]> {
    const connection = await pool.connect();
    try {
      await connection.query(`SELECT set_limit(0.1)`);

      const sql = `
        SELECT tag_id, name, post_count
        FROM tags
        WHERE name % $1
        ORDER BY post_count DESC
        LIMIT $2
      `;
      const result = await connection.query(sql, [query, limit]);
      return result.rows;
    } catch (error) {
      throw new Error(`search tags: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete orphan tags with zero posts. Returns deleted count for logging.
   */
  async cleanOrphans(): Promise<number> {
    const connection = await pool.connect();
    try {
      const result = await connection.query(`DELETE FROM tags WHERE post_count = 0`);
      return result.rowCount ?? 0;
    } catch (error) {
      throw new Error(`cleanOrphans: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }
}

export default TagModel;
