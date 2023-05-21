import { ValidationChain, check } from "express-validator";

const isEmail: ValidationChain = check("user_email")
	.isEmail()
	.withMessage("it is not an email !");
const checkPassword: ValidationChain = check("user_password")
	.isLength({ min: 6 })
	.withMessage("password is too short");
const checkName: ValidationChain = check("user_name")
	.isLength({ min: 3 })
	.withMessage("name is too short");

export default {
	register: [isEmail, checkPassword, checkName],
};
