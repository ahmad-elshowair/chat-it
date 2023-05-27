import bcrypt from "bcrypt";
import config from "../configs/config";

const checkPassword = (userPassword: string, dbPassword: string) => {
	// return the result
	return bcrypt.compareSync(userPassword + config.pepper, dbPassword);
};

// a method to hash the inputting password
const hashPassword = (password: string) => {
	return bcrypt.hashSync(password + config.pepper, config.salt);
};

export default {
	checkPassword,
	hashPassword,
};
