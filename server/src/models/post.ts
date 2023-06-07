import { QueryResult } from "pg";
import pool from "../database/pool";
import Post from "../types/post";

class PostModel {
	// create a post method
	async create(post: Post): Promise<Post> {
		// connect to the database
		const connection = await pool.connect();
		try {
			// create post query
			const sql =
				"INSERT INTO posts (user_id, description) VALUES($1, $2) RETURNING *";
			// insert post data
			const insertPost: QueryResult<Post> = await connection.query(sql, [
				post.user_id,
				post.description,
			]);
			// return post
			return insertPost.rows[0];
		} catch (error) {
			throw new Error(`create model: ${(error as Error).message}`);
		} finally {
			// release the the database
			connection.release();
		}
	}

	// get all posts

	// get a post by id
	async getById(id: string): Promise<Post> {
		// connect to the database
		const connection = await pool.connect();
		try {
			// get post data
			const post: QueryResult<Post> = await connection.query(
				"SELECT * FROM posts WHERE post_id = $1",
				[id],
			);
			// check if the post exist
			if (post.rowCount === 0) {
				throw new Error("Post not found");
			}
			// return post
			return post.rows[0];
		} catch (error) {
			throw new Error(`getById model: ${(error as Error).message}`);
		} finally {
			// release the the database
			connection.release();
		}
	}

	// get all posts by user id

	// update a post method
	async update(id: string, post: Post): Promise<Post> {
		// connect to the database
		const connection = await pool.connect();
		try {
			// check if the post exist
			const postExist: QueryResult<Post> = await connection.query(
				"SELECT * FROM posts WHERE post_id = $1",
				[id],
			);
			if (postExist.rowCount === 0) {
				throw new Error("Post not found");
			}

			// update post query
			const sql =
				"UPDATE posts SET description = $1, updated_at = $2 WHERE post_id = $3 RETURNING *";
			// update the post
			const updatePost: QueryResult<Post> = await connection.query(sql, [
				post.description,
				post.updated_at,
				id,
			]);
			// return post
			return updatePost.rows[0];
		} catch (error) {
			throw new Error(`update model: ${(error as Error).message}`);
		} finally {
			// release the the database
			connection.release();
		}
	}
	// delete a post
}

export default PostModel;
