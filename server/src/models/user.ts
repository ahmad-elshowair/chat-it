import { PoolClient, QueryResult } from "pg";
import db from "../database/pool";
import { TUser } from "../types/users";
import { buildUpdateQuery } from "../utilities/build-update-query";

class UserModel {
  async index(): Promise<TUser[]> {
    const connection = await db.connect();
    try {
      // connect to the database
      // get all the users
      const getUsersQuery = "SELECT * FROM users";
      const getUsers: QueryResult<TUser> = await connection.query(
        getUsersQuery
      );
      // if there are not users return a message
      if (!getUsers.rows) {
        throw new Error("NO USERS FOND!");
      }
      const users = getUsers.rows;
      // return the users
      return users;
    } catch (error) {
      throw new Error(`get all model: ${(error as Error).message}`);
    } finally {
      // close the connection
      connection.release();
    }
  }

  async getUserById(userId: string): Promise<TUser> {
    // connect to the database
    const connection = await db.connect();
    try {
      // get the user
      const query = "SELECT * FROM users WHERE user_id = ($1)";
      const result: QueryResult<TUser> = await connection.query(query, [
        userId,
      ]);
      // if the user is not found return a message
      if (result.rows.length === 0) {
        throw new Error("THIS USER IS NOT EXIST!");
      }
      // return the user
      return result.rows[0];
    } catch (error) {
      throw new Error(`model: ${(error as Error).message}`);
    } finally {
      // close the connection
      connection.release();
    }
  }

  async getAUser(user_name: string): Promise<TUser> {
    // connect to the database
    const connection = await db.connect();
    try {
      const getAUserQuery = `SELECT * FROM users WHERE user_name = $1`;
      const result: QueryResult<TUser> = await connection.query(getAUserQuery, [
        user_name,
      ]);

      // if there is not user return a message
      if (!result.rows[0]) {
        throw new Error("NO USER FOUND!");
      }
      await connection.query("COMMIT");
      // return the user
      return result.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(`model: ${(error as Error).message}`);
    } finally {
      // close the connection
      connection.release();
    }
  }

  async update(id: string, user: TUser): Promise<TUser> {
    // connect to the database
    const connection = await db.connect();
    try {
      // get the user
      const getUserQuery = "SELECT * FROM users WHERE user_id = ($1)";
      const getUser: QueryResult<TUser> = await connection.query(getUserQuery, [
        id,
      ]);
      // if the user is not found return a message
      if (getUser.rowCount === 0) {
        throw new Error("THIS USER IS NOT EXIST !");
      }
      // update the user
      await connection.query("BEGIN");
      // Build the dynamic update query.
      const [updateUserQuery, values] = buildUpdateQuery(id, user);
      const UpdateUser: QueryResult<TUser> = await connection.query(
        updateUserQuery,
        values
      );

      // return the user
      return UpdateUser.rows[0];
    } catch (error) {
      throw new Error(
        `cannot update ${user.user_name} due to ${(error as Error).message}`
      );
    } finally {
      // release the connection
      connection.release();
    }
  }

  async delete(id: string): Promise<TUser> {
    // connect to the database
    const connection = await db.connect();
    try {
      // get the user
      const getUserQuery = "SELECT * FROM users WHERE user_id = ($1)";
      const getUser: QueryResult<TUser> = await connection.query(getUserQuery, [
        id,
      ]);
      // if the user is not found return a message
      if (getUser.rowCount === 0) {
        throw new Error("THIS USER IS NOT EXIST !");
      }
      // delete the user
      const deleteUserQuery =
        "DELETE FROM users WHERE user_id = ($1) RETURNING *";
      const deleteUser: QueryResult<TUser> = await connection.query(
        deleteUserQuery,
        [id]
      );
      // return the user
      return deleteUser.rows[0];
    } catch (error) {
      throw new Error(`cannot delete ${id} due to ${(error as Error).message}`);
    } finally {
      // release the connection
      connection.release();
    }
  }

  async getUnknowns(user_id: string): Promise<TUser[]> {
    // connect to the database
    const connection = await db.connect();
    try {
      await connection.query("BEGIN");
      const getUnknownsQuery = `SELECT
										u.user_id, 
										u.user_name, 
										u.first_name, 
										u.last_name, 
										u.picture
									FROM users u
										LEFT JOIN follows f ON u.user_id = f.user_id_followed
										AND f.user_id_following = ($1)
									WHERE u.user_id != ($1)
									AND f.user_id_followed IS NULL`;
      const result: QueryResult = await connection.query(getUnknownsQuery, [
        user_id,
      ]);
      // return the users
      return result.rows;
    } catch (error) {
      throw new Error(
        `cannot get unknown users due to ${(error as Error).message}`
      );
    } finally {
      // release the connection
      connection.release();
    }
  }

  async updateOnlineStatus(
    user_id: string,
    is_online: boolean
  ): Promise<TUser> {
    // connect to the database.
    const connection: PoolClient = await db.connect();
    try {
      await connection.query("BEGIN");
      // update the online status.
      const updateOnlineStatusQuery = `
	  	UPDATE users
			SET is_online = ($1),
			updated_at = NOW()
		  WHERE user_id = ($2)
		  RETURNING *`;

      // execute the query
      const updateOnlineStatus: QueryResult<TUser> = await connection.query(
        updateOnlineStatusQuery,
        [is_online, user_id]
      );
      if (updateOnlineStatus.rowCount === 0) {
        throw new Error("THIS USER IS NOT EXIST !");
      }
      await connection.query("COMMIT");
      console.log(`[AUTH] user: ${user_id} online status set to: ${is_online}`);

      // return the user
      return updateOnlineStatus.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      throw new Error(
        `cannot update online status due to ${(error as Error).message}`
      );
    } finally {
      // release the connection
      connection.release();
    }
  }

  async getFriends(user_id: string, is_online: boolean = false) {
    // CONNECT TO THE DATABASE.
    const connection: PoolClient = await db.connect();
    try {
      // START TRANSACTION.
      await connection.query("BEGIN");

      let query = `SELECT 
								u.user_id,
								u.user_name,
								u.first_name,
								u.last_name,
								u.picture,
								u.cover,
								u.bio,
								u.marital_status,
								u.number_of_followers,
								u.number_of_followings,
                u.is_online
							FROM
								users u
								JOIN follows f1 ON u.user_id = f1.user_id_followed
								JOIN follows f2 ON f1.user_id_following = f2.user_id_followed
							WHERE
								f1.user_id_following = ($1)
								AND f2.user_id_following = u.user_id
								AND u.user_id != ($1)`;

      // CONDITIONALLY ADD ONLINE FILTER.
      if (is_online) {
        query += ` AND u.is_online = true`;
      }

      // ADD ORDERING - SHOW ONLINE FRIENDS FIRST THEN BY UPDATE TIME.
      query += ` ORDER BY u.is_online DESC, u.updated_at DESC`;

      const result: QueryResult<TUser> = await connection.query(query, [
        user_id,
      ]);
      const friends = result.rows;
      // COMMIT TRANSACTION.
      await connection.query("COMMIT");

      return friends;
    } catch (error) {
      // ROLLBACK TRANSACTION.
      await connection.query("ROLLBACK");
      throw new Error(`get friends model error: ${(error as Error).message}`);
    } finally {
      // RELEASE THE CONNECTION
      connection.release();
    }
  }
}

export default UserModel;
