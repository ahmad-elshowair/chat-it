import jwt from "jsonwebtoken";
import { UserPayload } from "../interfaces/UserPayload";

export const generateToken = (payload: UserPayload, secret: string) => {
	return jwt.sign(payload, secret, {
		expiresIn: "1h",
	});
};
