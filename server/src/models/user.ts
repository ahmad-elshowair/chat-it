import db from "../database/pool";

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
}

export default UserModel;
