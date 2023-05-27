import { ValidationChain, check } from "express-validator";
import db from "../../database/pool";
import passwords from "../../utilities/passwords";

const checkEmail: ValidationChain = check("email")
	.isEmail()
	.withMessage("it is not an email !");
const checkPassword: ValidationChain = check("password")
	.isLength({ min: 6 })
	.withMessage("password is too short");
const checkName: ValidationChain = check("user_name")
	.isLength({ min: 3 })
	.withMessage("name is too short");

const checkLogin: ValidationChain = check("email").custom(
	async (email: string, { req }) => {
		// connect to the database
		const connection = await db.connect();
		try {
			// select the user from the database
			const user = await db.query("SELECT * FROM users WHERE email=$1", [
				email,
			]);
			// check if the email exist
			if (user.rows.length === 0) {
				throw new Error(`INCORRECT EMAIL !`);
			}
			// check if the password is correct
			if (!passwords.checkPassword(req.body.password, user.rows[0].password)) {
				throw new Error("INCORRECT PASSWORD !");
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
