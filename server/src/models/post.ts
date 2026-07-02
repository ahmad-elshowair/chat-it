import { QueryResult } from 'pg';
import pool from '../database/pool.js';
import { IPaginatedResult } from '../interfaces/IPagination.js';
import { IFeedPost } from '../interfaces/IPost.js';
import { Post } from '../types/post.js';
import { AppError } from '../utilities/appError.js';
import { extractHashtags } from '../utilities/extractHashtags.js';
import TagModel from './tag.js';

const tag_model = new TagModel();

// ───── UNIFIED FEED CURSOR HELPERS ──────────────────────────────
// Composite cursor = base64("${activity_at_iso8601}|${activity_id}"), where
// activity_id is post_id for original posts and share_id for shares. The
// activity_id is a unique tie-breaker so pagination never skips/duplicates
// rows that share identical timestamps.

const encodeActivityCursor = (activityAt: Date, activityId: string): string =>
  Buffer.from(`${activityAt.toISOString()}|${activityId}`).toString('base64');

const decodeActivityCursor = (cursor: string): { at: string; id: string } | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf8');
    const sep = decoded.lastIndexOf('|');
    if (sep <= 0) {
      return null;
    }
    return { at: decoded.slice(0, sep), id: decoded.slice(sep + 1) };
  } catch {
    return null;
  }
};

const buildFeedPage = (rows: IFeedPost[], pageSize: number): IPaginatedResult<IFeedPost> => {
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const first = items[0];
  const last = items[items.length - 1];
  return {
    data: items,
    pagination: {
      hasMore,
      nextCursor:
        hasMore && last?.activity_at && last?.activity_id
          ? encodeActivityCursor(last.activity_at, last.activity_id)
          : undefined,
      previousCursor:
        first?.activity_at && first?.activity_id
          ? encodeActivityCursor(first.activity_at, first.activity_id)
          : undefined,
    },
  };
};

class PostModel {
  /**
   * CHECK EXISTING OF A POST.
   * @param id post id
   * @returns boolean
   */
  private async checkPostExist(id: string): Promise<boolean> {
    const connection = await pool.connect();
    try {
      const post: QueryResult<Post> = await connection.query(
        `SELECT * FROM posts WHERE post_id = $1`,
        [id],
      );
      return (post.rowCount ?? 0) > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * CREATE A POST
   * @param post post data
   * @returns post
   */
  async create(post: Post): Promise<Post> {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const sql = 'INSERT INTO posts (user_id, description, image) VALUES($1, $2, $3) RETURNING *';
      const insertPost: QueryResult<Post> = await connection.query(sql, [
        post.user_id,
        post.description,
        post.image,
      ]);
      await tag_model.syncPostTags(
        insertPost.rows[0].post_id!,
        extractHashtags(post.description),
        connection,
      );
      await connection.query('COMMIT');
      return insertPost.rows[0];
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`create post model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * GET A POST BY ID
   * @param post_id post id
   * @returns post
   */
  async fetchPostById(post_id: string, userId?: string): Promise<IFeedPost> {
    const connection = await pool.connect();
    try {
      let extraSelects = '';
      let likeJoin = '';
      let bookmarkJoin = '';
      const params: string[] = [post_id];

      if (userId) {
        params.push(userId);
        likeJoin = `LEFT JOIN likes l ON l.post_id = p.post_id AND l.user_id = $2`;
        bookmarkJoin = `LEFT JOIN bookmarks b ON b.post_id = p.post_id AND b.user_id = $2`;
        extraSelects = `,
      CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END AS is_liked,
      CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END AS is_bookmarked`;
      }

      const sql = `
        SELECT
          p.post_id, p.description, p.updated_at, p.image, p.number_of_likes,
          p.number_of_comments, p.number_of_shares, u.user_id, u.user_name, u.picture, u.first_name,
          u.last_name${extraSelects},
          (SELECT COALESCE(json_agg(t.name), '[]'::json) FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id) AS tags
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        ${likeJoin}
        ${bookmarkJoin}
        WHERE p.post_id = $1
      `;

      const post: QueryResult<IFeedPost> = await connection.query(sql, params);
      if (post.rowCount === 0) {
        throw new Error('Post not found');
      }
      return post.rows[0];
    } catch (error) {
      throw new Error(`fetch post by id model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * GET ALL POSTS (global discovery — excludes shares per FR-016)
   * @returns posts
   */
  async index(
    userId?: string,
    limit: number = 10,
    cursor?: string,
    direction: 'next' | 'previous' = 'next',
  ): Promise<{ posts: IFeedPost[] }> {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const params: (string | number)[] = [];
      let paramIdx = 1;

      let userIdParam = '';
      let likeJoin = '';
      let bookmarkJoin = '';
      let extraSelects = '';

      if (userId) {
        params.push(userId);
        userIdParam = `$${paramIdx}`;
        paramIdx++;
        likeJoin = `LEFT JOIN likes l ON l.post_id = p.post_id AND l.user_id = ${userIdParam}`;
        bookmarkJoin = `LEFT JOIN bookmarks b ON b.post_id = p.post_id AND b.user_id = ${userIdParam}`;
        extraSelects = `,
      CASE WHEN l.user_id IS NOT NULL THEN true ELSE false END AS is_liked,
      CASE WHEN b.user_id IS NOT NULL THEN true ELSE false END AS is_bookmarked`;
      }

      let sql = `
        SELECT
          p.post_id,
          p.description,
          p.updated_at,
          p.image,
          p.number_of_likes,
          p.number_of_comments,
          p.number_of_shares,
          u.user_id,
          u.user_name,
          u.picture,
          u.first_name,
          u.last_name${extraSelects},
          (SELECT COALESCE(json_agg(t.name), '[]'::json) FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id) AS tags
        FROM
          posts p
        JOIN
          users u
        ON
          p.user_id = u.user_id
        ${likeJoin}
        ${bookmarkJoin}
      `;

      if (cursor) {
        if (direction === 'next') {
          sql += ` WHERE p.updated_at < (SELECT updated_at FROM posts WHERE post_id = $${paramIdx})`;
        } else {
          sql += ` WHERE p.updated_at > (SELECT updated_at FROM posts WHERE post_id = $${paramIdx})`;
        }
        params.push(cursor);
        paramIdx++;
      }

      sql += direction === 'next' ? ' ORDER BY p.updated_at DESC' : ' ORDER BY p.updated_at ASC';

      sql += ` LIMIT $${paramIdx}`;

      params.push(limit);

      const result: QueryResult<IFeedPost> = await connection.query(sql, params);

      const posts = direction === 'previous' ? result.rows.reverse() : result.rows;

      await connection.query('COMMIT');
      return { posts };
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`index model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * UPDATE A POST
   * @param id post id
   * @param post post data
   * @returns post
   */
  async update(id: string, post: Post): Promise<Post> {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const exists = await this.checkPostExist(id);
      if (!exists) {
        throw new AppError('Post not found', 404);
      }
      const updatePost: QueryResult<Post> = await connection.query(
        'UPDATE posts SET description = $1, image = $2, updated_at = $3 WHERE post_id = $4 RETURNING *',
        [post.description, post.image, post.updated_at, id],
      );
      if (updatePost.rowCount === 0) {
        throw new AppError('Post not found', 404);
      }
      await tag_model.syncPostTags(id, extractHashtags(post.description), connection);
      await connection.query('COMMIT');
      return updatePost.rows[0];
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`update model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * DELETE A POST
   * @param id post id
   * @returns message
   */
  async delete(id: string): Promise<{ message: string }> {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const exists = await this.checkPostExist(id);
      if (!exists) {
        throw new AppError('Post not found', 404);
      }

      const tagIdsResult = await connection.query(
        `SELECT tag_id FROM post_tags WHERE post_id = $1`,
        [id],
      );
      const affectedTagIds = tagIdsResult.rows.map((r) => r.tag_id);

      const deleteResult = await connection.query('DELETE FROM posts WHERE post_id = $1', [id]);
      if (deleteResult.rowCount === 0) {
        throw new AppError('Post not found', 404);
      }

      for (const tagId of affectedTagIds) {
        await tag_model.decrementPostCount(tagId, connection);
      }
      await connection.query('COMMIT');
      return { message: `POST: ${id} HAS BEEN DELETED !` };
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`delete model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * GET A USER'S POSTS + SHARES (profile timeline). Unified via UNION ALL with a
   * composite cursor. Viewer interaction state (is_liked/is_bookmarked/is_shared)
   * is projected via EXISTS to avoid N+1 calls (FR-021).
   * @param user_id profile owner
   * @param limit page size (already +1 for has_more)
   * @param cursor composite cursor (opaque)
   * @param direction next | previous
   * @param userId viewer (for interaction state)
   * @returns paginated unified timeline
   */
  async userPosts(
    user_id: string,
    limit: number = 10,
    cursor?: string,
    direction: 'next' | 'previous' = 'next',
    userId?: string,
  ): Promise<IPaginatedResult<IFeedPost>> {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const viewerId = userId ?? user_id;
      const pageSize = Math.max(0, limit - 1);
      const decoded = cursor ? decodeActivityCursor(cursor) : null;
      const cursorAt: Date | null = decoded ? new Date(decoded.at) : null;
      const cursorId: string | null = decoded ? decoded.id : null;
      const next = direction === 'next';
      const order = next ? 'DESC' : 'ASC';

      const postCmp = next
        ? '(p.updated_at < $3 OR (p.updated_at = $3 AND p.post_id::text < $4))'
        : '(p.updated_at > $3 OR (p.updated_at = $3 AND p.post_id::text > $4))';
      const shareCmp = next
        ? '(s.created_at < $3 OR (s.created_at = $3 AND s.share_id::text < $4))'
        : '(s.created_at > $3 OR (s.created_at = $3 AND s.share_id::text > $4))';

      const sql = `
        (
          SELECT
            'post'::text AS type,
            p.post_id::text AS activity_id,
            p.updated_at AS activity_at,
            p.post_id, p.description, p.image,
            p.number_of_likes, p.number_of_comments, p.number_of_shares,
            p.user_id, u.user_name, u.picture, u.first_name, u.last_name,
            NULL::uuid AS shared_by_user_id,
            NULL::text AS shared_by_user_name,
            NULL::varchar AS share_commentary,
            EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.post_id AND l.user_id = $2) AS is_liked,
            EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = p.post_id AND b.user_id = $2) AS is_bookmarked,
            EXISTS (SELECT 1 FROM shares sh WHERE sh.original_post_id = p.post_id AND sh.user_id = $2) AS is_shared,
            COALESCE((SELECT json_agg(t.name) FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id), '[]'::json) AS tags
          FROM posts p
          JOIN users u ON u.user_id = p.user_id
          WHERE p.user_id = $1 AND ($3 IS NULL OR ${postCmp})
          ORDER BY p.updated_at ${order}, p.post_id ${order}
          LIMIT $5
        )
        UNION ALL
        (
          SELECT
            'share'::text AS type,
            s.share_id::text AS activity_id,
            s.created_at AS activity_at,
            p.post_id, p.description, p.image,
            p.number_of_likes, p.number_of_comments, p.number_of_shares,
            p.user_id, pu.user_name, pu.picture, pu.first_name, pu.last_name,
            s.user_id AS shared_by_user_id,
            su.user_name::text AS shared_by_user_name,
            s.commentary AS share_commentary,
            EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.post_id AND l.user_id = $2) AS is_liked,
            EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = p.post_id AND b.user_id = $2) AS is_bookmarked,
            EXISTS (SELECT 1 FROM shares sh WHERE sh.original_post_id = p.post_id AND sh.user_id = $2) AS is_shared,
            COALESCE((SELECT json_agg(t.name) FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id), '[]'::json) AS tags
          FROM shares s
          JOIN posts p ON p.post_id = s.original_post_id
          JOIN users pu ON pu.user_id = p.user_id
          JOIN users su ON su.user_id = s.user_id
          WHERE s.user_id = $1 AND ($3 IS NULL OR ${shareCmp})
          ORDER BY s.created_at ${order}, s.share_id ${order}
          LIMIT $5
        )
        ORDER BY activity_at ${order}, activity_id ${order}
        LIMIT $5
      `;

      const result: QueryResult<IFeedPost> = await connection.query(sql, [
        user_id,
        viewerId,
        cursorAt,
        cursorId,
        limit,
      ]);

      await connection.query('COMMIT');

      const rows = next ? result.rows : result.rows.reverse();
      return buildFeedPage(rows, pageSize);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`userPosts model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }

  /**
   * GET POSTS + SHARES OF THE USER AND THEIR FOLLOWINGS (home feed). Unified via
   * UNION ALL with a composite cursor; each branch pre-filters to the follow
   * graph and pre-limits to keep the outer sort cheap. Viewer interaction state
   * is projected via EXISTS (FR-021). Global discovery (index()) excludes shares
   * (FR-016).
   * @param user_id viewer
   * @param limit page size (already +1 for has_more)
   * @param cursor composite cursor (opaque)
   * @param direction next | previous
   * @returns paginated unified feed
   */
  async feed(
    user_id: string,
    limit: number = 10,
    cursor?: string,
    direction: 'next' | 'previous' = 'next',
  ): Promise<IPaginatedResult<IFeedPost>> {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const pageSize = Math.max(0, limit - 1);
      const decoded = cursor ? decodeActivityCursor(cursor) : null;
      const cursorAt: Date | null = decoded ? new Date(decoded.at) : null;
      const cursorId: string | null = decoded ? decoded.id : null;
      const next = direction === 'next';
      const order = next ? 'DESC' : 'ASC';

      const postCmp = next
        ? '(p.updated_at < $2 OR (p.updated_at = $2 AND p.post_id::text < $3))'
        : '(p.updated_at > $2 OR (p.updated_at = $2 AND p.post_id::text > $3))';
      const shareCmp = next
        ? '(s.created_at < $2 OR (s.created_at = $2 AND s.share_id::text < $3))'
        : '(s.created_at > $2 OR (s.created_at = $2 AND s.share_id::text > $3))';

      const sql = `
        (
          SELECT
            'post'::text AS type,
            p.post_id::text AS activity_id,
            p.updated_at AS activity_at,
            p.post_id, p.description, p.image,
            p.number_of_likes, p.number_of_comments, p.number_of_shares,
            p.user_id, u.user_name, u.picture, u.first_name, u.last_name,
            NULL::uuid AS shared_by_user_id,
            NULL::text AS shared_by_user_name,
            NULL::varchar AS share_commentary,
            EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.post_id AND l.user_id = $1) AS is_liked,
            EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = p.post_id AND b.user_id = $1) AS is_bookmarked,
            EXISTS (SELECT 1 FROM shares sh WHERE sh.original_post_id = p.post_id AND sh.user_id = $1) AS is_shared,
            COALESCE((SELECT json_agg(t.name) FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id), '[]'::json) AS tags
          FROM posts p
          JOIN users u ON u.user_id = p.user_id
          WHERE
            (p.user_id = $1
              OR p.user_id IN (SELECT user_id_followed FROM follows WHERE user_id_following = $1))
            AND ($2 IS NULL OR ${postCmp})
          ORDER BY p.updated_at ${order}, p.post_id ${order}
          LIMIT $4
        )
        UNION ALL
        (
          SELECT
            'share'::text AS type,
            s.share_id::text AS activity_id,
            s.created_at AS activity_at,
            p.post_id, p.description, p.image,
            p.number_of_likes, p.number_of_comments, p.number_of_shares,
            p.user_id, pu.user_name, pu.picture, pu.first_name, pu.last_name,
            s.user_id AS shared_by_user_id,
            su.user_name::text AS shared_by_user_name,
            s.commentary AS share_commentary,
            EXISTS (SELECT 1 FROM likes l WHERE l.post_id = p.post_id AND l.user_id = $1) AS is_liked,
            EXISTS (SELECT 1 FROM bookmarks b WHERE b.post_id = p.post_id AND b.user_id = $1) AS is_bookmarked,
            EXISTS (SELECT 1 FROM shares sh WHERE sh.original_post_id = p.post_id AND sh.user_id = $1) AS is_shared,
            COALESCE((SELECT json_agg(t.name) FROM post_tags pt JOIN tags t ON t.tag_id = pt.tag_id WHERE pt.post_id = p.post_id), '[]'::json) AS tags
          FROM shares s
          JOIN posts p ON p.post_id = s.original_post_id
          JOIN users pu ON pu.user_id = p.user_id
          JOIN users su ON su.user_id = s.user_id
          WHERE
            (s.user_id = $1
              OR s.user_id IN (SELECT user_id_followed FROM follows WHERE user_id_following = $1))
            AND ($2 IS NULL OR ${shareCmp})
          ORDER BY s.created_at ${order}, s.share_id ${order}
          LIMIT $4
        )
        ORDER BY activity_at ${order}, activity_id ${order}
        LIMIT $4
      `;

      const result: QueryResult<IFeedPost> = await connection.query(sql, [
        user_id,
        cursorAt,
        cursorId,
        limit,
      ]);

      await connection.query('COMMIT');

      const rows = next ? result.rows : result.rows.reverse();
      return buildFeedPage(rows, pageSize);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw new Error(`feed model: ${(error as Error).message}`, { cause: error });
    } finally {
      connection.release();
    }
  }
}

export default PostModel;
