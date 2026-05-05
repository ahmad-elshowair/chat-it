import { QueryResult } from 'pg';
import pool from '../database/pool.js';
import { TSearchResult } from '../types/search.js';
import { AppError } from '../utilities/appError.js';

type CursorData = {
  rank: number;
  post_id: string;
};

class SearchModel {
  /**
   * Decode composite cursor from Base64 JSON
   */
  private decodeCursor(cursor: string): CursorData {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      if (typeof decoded.rank !== 'number' || typeof decoded.post_id !== 'string') {
        throw new AppError('Invalid cursor format', 400);
      }
      return decoded as CursorData;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid cursor: malformed encoding', 400);
    }
  }

  /**
   * Search posts by keywords using PostgreSQL full-text search
   * @param userId - authenticated user ID for interaction state
   * @param query - search query string
   * @param limit - max results (fetches limit + 1 for hasMore detection)
   * @param cursor - Base64-encoded composite cursor (rank + post_id)
   * @param direction - pagination direction
   * @returns search results with rank for internal sorting
   */
  async search(
    userId: string,
    query: string,
    limit: number,
    cursor?: string,
    direction: 'next' | 'previous' = 'next',
  ): Promise<TSearchResult[]> {
    const connection = await pool.connect();
    try {
      const params: (string | number)[] = [];
      let paramIdx = 1;

      params.push(query);
      const queryParam = `$${paramIdx}`;
      paramIdx++;

      params.push(userId);
      const userIdParam = `$${paramIdx}`;
      paramIdx++;

      let cursorCondition = '';
      if (cursor) {
        const cursorData = this.decodeCursor(cursor);

        params.push(cursorData.rank);
        const rankParam = `$${paramIdx}`;
        paramIdx++;

        params.push(cursorData.post_id);
        const postIdParam = `$${paramIdx}`;
        paramIdx++;

        if (direction === 'next') {
          cursorCondition = ` AND (rank, post_id) < (${rankParam}, ${postIdParam})`;
        } else {
          cursorCondition = ` AND (rank, post_id) > (${rankParam}, ${postIdParam})`;
        }
      }

      const sql = `
        SELECT * FROM (
          SELECT
            p.post_id, p.description, p.updated_at, p.image, p.number_of_likes,
            p.number_of_comments,
            u.user_id, u.user_name, u.picture, u.first_name, u.last_name,
            CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END AS is_liked,
            CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END AS is_bookmarked,
            ts_rank(p.search_vector, websearch_to_tsquery('english', ${queryParam})) AS rank
          FROM posts p
          JOIN users u ON p.user_id = u.user_id
          LEFT JOIN likes l ON l.post_id = p.post_id AND l.user_id = ${userIdParam}
          LEFT JOIN bookmarks b ON b.post_id = p.post_id AND b.user_id = ${userIdParam}
          WHERE p.search_vector @@ websearch_to_tsquery('english', ${queryParam})
        ) sub
        WHERE 1=1${cursorCondition}
        ORDER BY rank DESC, post_id DESC
        LIMIT $${paramIdx}
      `;
      params.push(limit);

      const result: QueryResult<TSearchResult> = await connection.query(sql, params);
      return result.rows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[SEARCH MODEL] search error', error);
      throw new Error(`Search failed: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * Encode composite cursor as Base64 JSON
   */
  encodeCursor(rank: number, post_id: string): string {
    return Buffer.from(JSON.stringify({ rank, post_id })).toString('base64');
  }
}

export default SearchModel;
