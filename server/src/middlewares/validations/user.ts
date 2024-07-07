import { ValidationChain, check } from "express-validator";
import db from "../../database/pool";
import passwords from "../../utilities/passwords";

const checkLength = (
	field: string,
	min: number,
	message: string,
): ValidationChain => check(field).isLength({ min }).withMessage(message);

const checkIsEmail: ValidationChain = check("email")
	.isEmail()
	.withMessage("Invalid email format! Example: 'example@domain-name.com'");

const checkPasswordLength: ValidationChain = checkLength(
	"password",
	6,
	"PASSWORD MUST BE AT LEAST 6 CHARACTERS LONG !",
);
const checkPasswordMatch: ValidationChain = check("confirm_password").custom(
	(confirmPassword: string, { req }) => {
		if (confirmPassword !== req.body.password) {
			throw new Error(`PASSWORDS DO NOT MATCH !`);
		}
		return true;
	},
);

// CHECK IF THE PASSWORD IS CORRECT.
const checkPassword: ValidationChain = check("password").custom(
	async (password: string, { req }) => {
		const connection = await db.connect();
		try {
			const result = await connection.query(
				"SELECT * FROM users WHERE email = $1",
				[req.body.email],
			);
			const user = result.rows[0];
			// check if the password is correct
			if (!user || !passwords.checkPassword(password, user.rows[0].password)) {
				throw new Error("INCORRECT PASSWORD !");
			}
		} catch (error) {
			throw new Error(`Authentication failed ${(error as Error).message}!`);
		} finally {
			connection.release();
		}
	},
);

// CHECK IF THE USER NAME LENGTH IS AT LEAST 3 CHARACTERS.
const checkNameLength: ValidationChain = checkLength(
	"user_name",
	3,
	"USERNAME MUST BE AT LEAST 6 CHARACTERS LONG !",
);

// CHECK IF THE FIRST NAME LENGTH IS AT LEAST 3 CHARACTER
const checkFirstNameLength: ValidationChain = checkLength(
	"first_name",
	3,
	"THE FIRST NAME MUST BE AT LEAST 3 CHARACTERS!",
);

// CHECK IF THE FIRST NAME LENGTH IS AT LEAST 3 CHARACTER
const checkLastNameLength: ValidationChain = checkLength(
	"last_name",
	3,
	"THE LAST NAME MUST BE AT LEAST 3 CHARACTERS!",
);

//CHECK IF THE EMAIL EXISTS IN THE DATABASE.
const isEmailExist: ValidationChain = check("email").custom(
	async (email: string, { req }) => {
		// connect to the database
		const connection = await db.connect();
		try {
			// select the user from the database
			const result = await db.query("SELECT * FROM users WHERE email=$1", [
				email,
			]);
			const user = result.rows[0];

			if (!user) {
				throw new Error(`${email} DOES NOT EXIST !`);
			}

			req.user = user;
		} catch (error) {
			throw new Error(`USER LOOKUP FAILED: ${(error as Error).message}`);
		} finally {
			connection.release();
		}
	},
);
export default {
	register: [
		checkIsEmail,
		checkPasswordLength,
		checkNameLength,
		checkFirstNameLength,
		checkLastNameLength,
		checkPasswordMatch,
	],
	login: [isEmailExist, checkIsEmail, checkPasswordLength, checkPassword],
};
