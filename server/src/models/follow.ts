import { PoolClient, QueryResult } from "pg";
import db from "../database/pool";
import { TUser } from "../types/users";

export default class FollowModel {
  async checkIfFollowing(
    following_id: string,
    followed_id: string
  ): Promise<boolean> {
    // CONNECT TO THE DATABASE
    const connection: PoolClient = await db.connect();
    try {
      // BEGIN TRANSACTION
      await connection.query("BEGIN");

      // CHECK IF A USER FOLLOWING A USER.
      const result: QueryResult<TUser> = await connection.query(
        "SELECT * FROM follows WHERE user_id_following = ($1) AND user_id_followed = ($2)",
        [following_id, followed_id]
      );

      // COMMIT TRANSACTION
      await connection.query("COMMIT");
      const user = result.rows[0];

      if (user) {
        return true;
      }

      return false;
    } catch (error) {
      // ROLLBACK TRANSACTION ON ERROR.
      await connection.query("ROLLBACK");
      console.error(error);
      throw new Error(`check follow model error: ${(error as Error).message}`);
    } finally {
      // RELEASE THE CONNECTION.
      connection.release();
    }
  }

  async follow(
    user_id_following: string,
    user_id_followed: string
  ): Promise<{ message: string }> {
    const connection: PoolClient = await db.connect();
    try {
      // START TRANSACTION
      await connection.query("BEGIN");

      if (!(await this.checkIfFollowing(user_id_following, user_id_followed))) {
        await connection.query(
          `INSERT INTO follows (user_id_following, user_id_followed) VALUES ($1, $2)`,
          [user_id_following, user_id_followed]
        );

        // INCREMENT THE "number_of_followings" FOR THE FOLLOWING USER.
        await connection.query(
          "UPDATE users SET number_of_followings = number_of_followings + 1 WHERE user_id = ($1)",
          [user_id_following]
        );

        // INCREMENT THE "number_of_followers" FOR THE FOLLOWED USER.
        await connection.query(
          "UPDATE users SET number_of_followers = number_of_followers + 1 WHERE user_id = ($1)",
          [user_id_followed]
        );

        // COMMIT TRANSACTION
        await connection.query("COMMIT");

        return { message: `${user_id_followed} has been followed !` };
      } else {
        // ROLLBACK TRANSACTION ON MESSAGE.
        await connection.query("ROLLBACK");
        return { message: `${user_id_followed} is already followed` };
      }
    } catch (error) {
      // ROLLBACK TRANSACTION ON ERROR.
      await connection.query("ROLLBACK");
      console.error(error);
      throw new Error(`Follow model error: ${(error as Error).message}`);
    } finally {
      // release the connection
      connection.release();
    }
  }

  async unFollow(user_id_following: string, user_id_followed: string) {
    const connection: PoolClient = await db.connect();
    try {
      // START TRANSACTION
      await connection.query("BEGIN");

      if (await this.checkIfFollowing(user_id_following, user_id_followed)) {
        await connection.query(
          "DELETE FROM follows WHERE user_id_following = ($1) AND user_id_followed = ($2)",
          [user_id_following, user_id_followed]
        );

        // DECREMENT THE "number_of_followings" FOR THE FOLLOWING USER.
        await connection.query(
          "UPDATE users SET number_of_followings = number_of_followings - 1 WHERE user_id= ($1) AND number_of_followings > 0",
          [user_id_following]
        );

        // DECREMENT THE "number_of_followers" FOR THE FOLLOWED USER.
        await connection.query(
          "UPDATE users SET number_of_followers = number_of_followers - 1 WHERE user_id = ($1) AND number_of_followers > 0",
          [user_id_followed]
        );

        // COMMIT TRANSACTION
        await connection.query("COMMIT");

        return { message: `${user_id_followed} has been un followed` };
      } else {
        // ROLLBACK TRANSACTION ON MESSAGE.
        await connection.query("ROLLBACK");
        return { message: `${user_id_followed} is not currently followed` };
      }
    } catch (error) {
      // ROLLBACK TRANSACTION ON ERROR.
      await connection.query("ROLLBACK");
      console.error(error);
      throw new Error(`Unfollow model error: ${(error as Error).message}`);
    } finally {
      // RELEASE THE CONNECTION
      connection.release();
    }
  }

  async getNumberOfFollowings(user_id: string): Promise<number> {
    const connection: PoolClient = await db.connect();
    try {
      // get followings query
      const query = `
          SELECT
            COUNT(DISTINCT user_id_followed) AS "followings"
          FROM
            follows
          WHERE
            user_id_following = ($1);
      `;

      // get the followings
      const result = await connection.query(query, [user_id]);
      const numOfFollowings: number = result.rows[0];
      return numOfFollowings;
    } catch (error) {
      throw new Error(
        `get followings model error: ${(error as Error).message}`
      );
    } finally {
      // release the connection
      connection.release();
    }
  }

  async getNumberOfFollowers(user_id: string): Promise<number> {
    const connection: PoolClient = await db.connect();
    try {
      // get the followers
      const result = await connection.query(
        `
          SELECT
            COUNT(DISTINCT f.user_id_following) AS "followers"
          FROM
            follows AS f
          WHERE
            f.user_id_followed = ($1)
        `,
        [user_id]
      );
      const numOfFollowers: number = result.rows[0];
      return numOfFollowers;
    } catch (error) {
      throw new Error(`get followers model error: ${(error as Error).message}`);
    } finally {
      // release the connection
      connection.release();
    }
  }

  async getFollowings(user_id: string): Promise<TUser[]> {
    // CONNECT TO THE DATABASE.
    const connection: PoolClient = await db.connect();
    try {
      // START TRANSACTION.
      await connection.query("BEGIN");
      const query = `SELECT
			u.user_id,
			u.user_name,
			u.first_name,
			u.last_name,
			u.picture,
			u.cover,
			u.bio,
			u.number_of_followers,
			u.number_of_followings
			FROM
			users u
			JOIN follows f ON u.user_id = f.user_id_followed
			WHERE f.user_id_following = ($1)
			ORDER BY f.created_on DESC`;
      const result: QueryResult<TUser> = await connection.query(query, [
        user_id,
      ]);
      const followings = result.rows;
      // COMMIT TRANSACTION.
      await connection.query("COMMIT");
      return followings;
    } catch (error) {
      // ROLLBACK TRANSACTION.
      await connection.query("ROLLBACK");
      throw new Error(
        `get followings model error: ${(error as Error).message}`
      );
    } finally {
      // RELEASE THE CONNECTION
      connection.release();
    }
  }

  async getFollowers(user_id: string): Promise<TUser[]> {
    // CONNECT TO THE DATABASE.
    const connection: PoolClient = await db.connect();
    try {
      // START TRANSACTION.
      await connection.query("BEGIN");
      const query = `SELECT
			u.user_id,
			u.user_name,
			u.first_name,
			u.last_name,
			u.picture,
			u.cover,
			u.bio,
			u.number_of_followers,
			u.number_of_followings
			FROM
			users u
			JOIN follows f ON u.user_id = f.user_id_following
			WHERE f.user_id_followed = ($1)
			ORDER BY f.created_on DESC`;
      const result: QueryResult<TUser> = await connection.query(query, [
        user_id,
      ]);
      const followers = result.rows;
      // COMMIT TRANSACTION.
      await connection.query("COMMIT");
      return followers;
    } catch (error) {
      // ROLLBACK TRANSACTION.
      await connection.query("ROLLBACK");
      throw new Error(
        `get followings model error: ${(error as Error).message}`
      );
    } finally {
      // RELEASE THE CONNECTION
      connection.release();
    }
  }
}
