import { PoolClient, QueryResult } from 'pg';
import pool from '../database/pool.js';
import { TBookmark } from '../types/bookmark.js';

class BookmarkModel {
  /**
   * Validate required fields for a bookmark action.
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
   * Toggle bookmark status for a post. Creates bookmark if absent, removes if present.
   * @param userId - the authenticated user's ID
   * @param postId - the post to bookmark/unbookmark
   * @returns bookmark record on add, or confirmation on remove
   * @throws {Error} if post not found or operation fails
   * @route POST /api/bookmarks/:post_id
   */
  async toggle(
    userId: string,
    postId: string,
  ): Promise<
    | {
        bookmark_id: string;
        post_id: string;
        user_id: string;
        created_at: Date;
        action: 'bookmarked';
      }
    | { bookmark_id: string; action: 'unbookmarked' }
    | { message: string; action: 'bookmarked' | 'unbookmarked' }
  > {
    this.validateRequiredFields({ user_id: userId, post_id: postId }, ['user_id', 'post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');

      const postCheckSql = `
        SELECT p.post_id
        FROM posts p
        WHERE p.post_id = $1
      `;
      const postCheck: QueryResult = await connection.query(postCheckSql, [postId]);

      if (postCheck.rowCount === 0) {
        throw new Error('Post not found');
      }

      const bookmarkStatusSql = `
        SELECT bookmark_id
        FROM bookmarks
        WHERE user_id = $1 AND post_id = $2
      `;
      const statusCheck: QueryResult = await connection.query(bookmarkStatusSql, [userId, postId]);

      const isAlreadyBookmarked = statusCheck.rowCount !== null && statusCheck.rowCount > 0;

      if (isAlreadyBookmarked) {
        const existingBookmarkId = statusCheck.rows[0].bookmark_id;
        const deleteSql = `
          DELETE FROM bookmarks
          WHERE post_id = $1 AND user_id = $2
        `;
        const deleteResult = await connection.query(deleteSql, [postId, userId]);

        if (deleteResult.rowCount === 1) {
          const updateCounterSql = `
            UPDATE posts
            SET number_of_bookmarks = number_of_bookmarks - 1, updated_at = NOW()
            WHERE post_id = $1
          `;
          await connection.query(updateCounterSql, [postId]);
        }

        await connection.query('COMMIT');
        if (deleteResult.rowCount === 1) {
          return { bookmark_id: existingBookmarkId, action: 'unbookmarked' };
        }
        return { message: 'Post unbookmarked successfully', action: 'unbookmarked' };
      } else {
        const insertSql = `
          INSERT INTO bookmarks (user_id, post_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, post_id) DO NOTHING
          RETURNING bookmark_id, post_id, user_id, created_at
        `;
        const insertResult: QueryResult = await connection.query(insertSql, [userId, postId]);

        if (insertResult.rowCount === 1) {
          const row = insertResult.rows[0];
          const updateCounterSql = `
            UPDATE posts
            SET number_of_bookmarks = number_of_bookmarks + 1, updated_at = NOW()
            WHERE post_id = $1
          `;
          await connection.query(updateCounterSql, [postId]);

          await connection.query('COMMIT');
          return {
            bookmark_id: row.bookmark_id,
            post_id: row.post_id,
            user_id: row.user_id,
            created_at: row.created_at,
            action: 'bookmarked',
          };
        }

        await connection.query('COMMIT');
        return { message: 'Post bookmarked successfully', action: 'bookmarked' };
      }
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('[BOOKMARK MODEL] toggle error', error);
      throw new Error(`Bookmark toggle failed: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Get paginated bookmarks for a user, ordered by most recently saved first.
   * @param userId - the bookmark owner's ID
   * @param limit - max results per page (already +1 for has_more detection)
   * @param cursor - bookmark_id of the last item from previous page
   * @param direction - pagination direction
   * @returns array of bookmarks for the requesting user
   */
  async getUserBookmarks(
    userId: string,
    limit: number = 20,
    cursor?: string,
    direction: 'next' | 'previous' = 'next',
  ): Promise<TBookmark[]> {
    this.validateRequiredFields({ user_id: userId }, ['user_id']);

    const connection: PoolClient = await pool.connect();
    try {
      await connection.query('BEGIN');
      const params: (string | number)[] = [userId];

      let sql = `
        SELECT
          bookmark_id,
          user_id,
          post_id,
          created_at
        FROM
          bookmarks
        WHERE
          user_id = $1
      `;

      if (cursor) {
        const cursorCheck = await connection.query(
          `SELECT created_at FROM bookmarks WHERE bookmark_id = $1`,
          [cursor],
        );

        if (cursorCheck.rows.length > 0) {
          const timestamp = cursorCheck.rows[0].created_at;
          if (direction === 'next') {
            sql += ` AND created_at < $2`;
          } else {
            sql += ` AND created_at > $2`;
          }
          params.push(timestamp);
        } else {
          console.warn(`Bookmark with ID ${cursor} not found for pagination`);
        }
      }

      sql +=
        direction === 'next'
          ? ' ORDER BY created_at DESC, bookmark_id DESC'
          : ' ORDER BY created_at ASC, bookmark_id ASC';

      sql += ` LIMIT $${params.length + 1}`;
      params.push(limit);

      const result: QueryResult<TBookmark> = await connection.query(sql, params);

      await connection.query('COMMIT');
      return direction === 'previous' ? result.rows.reverse() : result.rows;
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('[BOOKMARK MODEL] getUserBookmarks error', error);
      throw new Error(`Failed to get user bookmarks: ${(error as Error).message}`, {
        cause: error,
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Check if a user has bookmarked a specific post.
   * @param userId - the authenticated user's ID
   * @param postId - the post to check
   * @returns whether the user has bookmarked the post
   */
  async isBookmarked(userId: string, postId: string): Promise<{ isBookmarked: boolean }> {
    this.validateRequiredFields({ user_id: userId, post_id: postId }, ['user_id', 'post_id']);

    const connection: PoolClient = await pool.connect();
    try {
      const sql = `
        SELECT 1
        FROM bookmarks
        WHERE user_id = $1 AND post_id = $2
      `;
      const result: QueryResult = await connection.query(sql, [userId, postId]);

      return { isBookmarked: result.rows.length > 0 };
    } catch (error) {
      console.error('[BOOKMARK MODEL] isBookmarked error', error);
      throw new Error(`Failed to check bookmark: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }
}

export default BookmarkModel;
