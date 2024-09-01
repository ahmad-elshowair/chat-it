import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../configs/config";
import { CustomRequest } from "../interfaces/ICustomRequest";

const authorize_user = (
	req: CustomRequest,
	res: Response,
	next: NextFunction,
) => {
	const token = req.cookies.access_token;
	if (!token) {
		return res.status(401).json({ message: "Access Token is missing!" });
	}
	try {
		const decoded = jwt.verify(token, config.jwt_secret);
		req.user = decoded;
		next();
	} catch (error) {
		return res.status(403).json({ message: "Invalid Access token" });
	}
};
export default authorize_user;
