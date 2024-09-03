import { NextFunction, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../configs/config";
import { ICustomRequest } from "../interfaces/ICustomRequest";

const authorizeUser = (
	req: ICustomRequest,
	res: Response,
	next: NextFunction,
) => {
	const token = req.cookies.access_token;

	console.log("access token from authorize function: ", token);

	if (!token) {
		return res.status(401).json({ message: "Access Token is missing!" });
	}
	try {
		const decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;
		req.user = decoded;
		next();
	} catch (error) {
		return res.status(403).json({ message: "Invalid Access token" });
	}
};
export default authorizeUser;
