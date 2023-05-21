import bcrypt from "bcrypt";
import { QueryResult } from "pg";
import config from "../configs/config";
import db from "../database/pool";
import User from "../types/users";

class UserModel {
	// get all users
	async getAll() {
		// connect to the database
		const connection = await db.connect();
		try {
			// get all the users
			const getUsersQuery = "SELECT * FROM users";
			const getUsers = await db.query(getUsersQuery);
			// if there are not users return a message
			if (getUsers.rowCount === 0) {
				return {
					message: "No users found",
				};
			}
			// return the users
			return {
				error: false,
				message: "Users found",
				users: getUsers.rows,
			};
		} catch (error) {
			console.error(`cannot get all users due to ${(error as Error).message}`);
		} finally {
			// release the connection
			connection.release();
		}
	}

	// a method to hash the inputting password
	hashPassword(password: string) {
		return bcrypt.hashSync(password + config.pepper, config.salt);
	}

	//a method to create a new user
	async create(user: User) {
		// connect to the database
		const connection = await db.connect();
		try {
			// check ig the user exist
			const checkUserQuery = "SELECT * FROM users WHERE user_email=$1";
			const checkUser: QueryResult<User> = await db.query(checkUserQuery, [
				user.user_email,
			]);
			if (checkUser.rowCount > 0) {
				return {
					error: true,
					message: "User already exist",
				};
			}

			// insert the new user
			const insertUserQuery =
				"INSERT INTO users (user_name, user_email, user_password,) VALUES ($1, $2, $3) RETURNING *";
			const insertUser = await db.query(insertUserQuery, [
				user.user_name,
				user.user_email,
				this.hashPassword(user.user_password),
			]);
			// return the inserted user
			return {
				error: false,
				message: "User created",
				user: insertUser.rows[0],
			};
		} catch (error) {
			console.error(
				`cannot create a new user due to ${(error as Error).message}`,
			);
		} finally {
			// release the connection
			connection.release();
		}
	}
}

export default UserModel;
