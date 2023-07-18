import { PoolClient, QueryResult } from "pg";
import db from "../database/pool";

export default class FollowService {
  // follow
  async follow(
    user_id_following: string,
    user_id_followed: string
  ): Promise<{ message: string }> {
    const connection: PoolClient = await db.connect();
    try {
      // check if the follower follows the followed
      const queryCheckFollow =
        "SELECT * FROM follows WHERE user_id_following = ($1) AND user_id_followed = ($2)";
      const checkFollow: QueryResult = await connection.query(
        queryCheckFollow,
        [user_id_following, user_id_followed]
      );
      if (checkFollow.rowCount > 0) {
        // un follow the user
        await connection.query(
          "DELETE FROM follows WHERE user_id_following = ($1) AND user_id_followed = ($2) RETURNING *",
          [user_id_following, user_id_followed]
        );
        return { message: `${user_id_followed} has been un followed` };
      } else {
        // add the follow
        await connection.query(
          `INSERT INTO follows (user_id_following, user_id_followed) VALUES ($1, $2) RETURNING *`,
          [user_id_following, user_id_followed]
        );
        return { message: `${user_id_followed} has been followed !` };
      }
    } catch (error) {
      throw new Error(`Follow model error: ${(error as Error).message}`);
    } finally {
      // release the connection
      connection.release();
    }
  }

  // get number followings for a user
  async getFollowings(user_id_following: string) {
    const connection: PoolClient = await db.connect();
    try {
      // get followings query
      const getFollowingsQuery = `
          SELECT
            COUNT(*) AS num_followings
          FROM
            follows
          WHERE
            user_id_followed = ($1)
      `;

      console.log(getFollowingsQuery);

      // get the followings
      const fetchFollowings: QueryResult = await connection.query(
        getFollowingsQuery,
        [user_id_following]
      );
      const followings = Number(fetchFollowings.rows[0]);
      return followings;
    } catch (error) {
      throw new Error(
        `get followings model error: ${(error as Error).message}`
      );
    } finally {
      // release the connection
      connection.release();
    }
  }

  // get number followers for a user
  async getFollowers(user_id_followed: string) {
    const connection: PoolClient = await db.connect();
    try {
      // get the followers
      const followers: QueryResult = await connection.query(
        `
          SELECT
            user_id_followed AS following,
            COUNT(f.user_id_followed) AS followers
          FROM
            follows AS f
          WHERE
            f.user_id_following = ($1)
          GROUP BY
            f.user_id_followed
        `,
        [user_id_followed]
      );

      return followers.rows;
    } catch (error) {
      throw new Error(`get followers model error: ${(error as Error).message}`);
    } finally {
      // release the connection
      connection.release();
    }
  }
}
