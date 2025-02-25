import { QueryResult } from "pg";
import db from "../database/pool";
import { TRegisterCredentials, TUser } from "../types/users";
import passwords from "../utilities/passwords";

class AuthModel {
  //a method to create a new user
  async register(registerCredentials: TRegisterCredentials): Promise<TUser> {
    const connection = await db.connect();
    try {
      await connection.query("BEGIN");

      // CHECK IF THE EMAIL IS ALREADY IN USE .
      const existingUser = await connection.query<TUser>(
        "SELECT * FROM users WHERE email=$1",
        [registerCredentials.email]
      );

      if (existingUser.rows[0]) {
        throw new Error(`Email is already in use !`);
      }

      // HASH THE PASSWORD
      const hashedPassword = passwords.hashPassword(
        registerCredentials.password
      );

      // INSERT THE USER INTO THE DATABASE
      const queryInsert = `
          INSERT INTO users (
            first_name,
            last_name,
            user_name,
            email,
            password
          ) 
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *`;
      const values = [
        registerCredentials.first_name,
        registerCredentials.last_name,
        registerCredentials.user_name,
        registerCredentials.email,
        hashedPassword,
      ];

      const registerUserResult: QueryResult<TUser> = await connection.query(
        queryInsert,
        values
      );

      await connection.query("COMMIT");

      return registerUserResult.rows[0];
    } catch (error) {
      await connection.query("ROLLBACK");
      console.error(`Error in register model: ${(error as Error).message}`);

      throw new Error(`failed to register user: ${(error as Error).message}`);
    } finally {
      // RELEASE THE CONNECTION.
      connection.release();
    }
  }

  // login user
  async login(email: string, password: string): Promise<TUser> {
    // connect to the database
    const connection = await db.connect();
    try {
      //select a user form the database
      const result = await db.query<TUser>(
        "SELECT * FROM users WHERE email=$1",
        [email]
      );
      const user = result.rows[0];
      if (!user) {
        throw new Error(`user not found !`);
      }
      // return the user
      return user;
    } catch (error) {
      throw new Error(
        `something wrong with login method ${(error as Error).message}`
      );
    } finally {
      // release the connection
      connection.release();
    }
  }
}

export default AuthModel;
