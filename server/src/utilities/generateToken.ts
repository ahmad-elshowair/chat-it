import jwt from "jsonwebtoken";
import { UserPayload } from "../interfaces/IUserPayload";

export const generateToken = (payload: UserPayload, secret: string) => {
	return jwt.sign(payload, secret, {
		expiresIn: "1h",
	});
};
