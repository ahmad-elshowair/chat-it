import { check } from "express-validator";
import db from "../../database/pool";

const checkUser = check("followed_id").custom(async (user_id: string) => {
	// connect to the database
	const connection = await db.connect();
	try {
		// select the user from the database
		const user = await connection.query(
			"SELECT * FROM users WHERE user_id = $1",
			[user_id],
		);
		if (user.rowCount < 1) {
			throw new Error("THE USER IS NOT FOUND !");
		}
	} catch (error) {
		// if there is an error throw it
		throw error;
	} finally {
		// close the connection
		connection.release();
	}
});

export default {
	checkFollow: [checkUser],
};
