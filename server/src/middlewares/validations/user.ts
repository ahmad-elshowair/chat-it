import { compareSync } from "bcrypt";
import { ValidationChain, check } from "express-validator";
import config from "../../configs/config";
import db from "../../database/pool";

const checkEmail: ValidationChain = check("user_email")
	.isEmail()
	.withMessage("it is not an email !");
const checkPassword: ValidationChain = check("user_password")
	.isLength({ min: 6 })
	.withMessage("password is too short");
const checkName: ValidationChain = check("user_name")
	.isLength({ min: 3 })
	.withMessage("name is too short");

const checkLogin: ValidationChain = check("user_email").custom(
	async (email: string, { req }) => {
		// connect to the database
		const connection = await db.connect();
		try {
			// select the user from the database
			const user = await db.query("SELECT * FROM users WHERE user_email=$1", [
				email,
			]);
			// check if the email exist
			if (user.rows.length === 0) {
				throw new Error(`this ${email} is not exist`);
			}
			// check if the password is correct
			if (
				!compareSync(
					req.body.user_password + config.pepper,
					user.rows[0].user_password,
				)
			) {
				throw new Error("password is incorrect");
			}
			req.user = user.rows[0];
		} catch (error) {
			throw new Error((error as Error).message);
		} finally {
			connection.release();
		}
	},
);
export default {
	register: [checkEmail, checkPassword, checkName],
	login: [checkLogin, checkEmail],
};
