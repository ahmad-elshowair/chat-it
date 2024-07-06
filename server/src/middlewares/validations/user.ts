import { ValidationChain, check } from "express-validator";
import db from "../../database/pool";
import passwords from "../../utilities/passwords";

const checkIsEmail: ValidationChain = check("email")
	.isEmail()
	.withMessage("Invalid email format! Example: 'example@domain-name.com'");

const checkPasswordLength: ValidationChain = check("password")
	.isLength({ min: 6 })
	.withMessage("PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG !");

const checkName: ValidationChain = check("user_name")
	.isLength({ min: 3 })
	.withMessage("USERNAME MUST BE AT LEAST 6 CHARACTERS LONG !");

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
				throw new Error(`${email} IS NOT EXIST !`);
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
	register: [checkIsEmail, checkPasswordLength, checkName],
	login: [checkLogin, checkIsEmail],
};
