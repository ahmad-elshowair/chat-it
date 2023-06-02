import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../configs/config";
import { CustomRequest } from "../interfaces/CustomRequest";

const authorize_user = (
	req: CustomRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const headerAuth = req.headers["authorization"];
		if (headerAuth) {
			const token = headerAuth.split(" ")[1];
			if (token) {
				const decoded = jwt.verify(token, config.jwt_secret);
				req.user = decoded;
				next();
			} else {
				// invalid token
				res.status(401).json({
					error: "Invalid Token",
				});
				next();
			}
		} else {
			// no token provided
			res.status(401).json({
				error: "No Token Provided",
			});
			next();
		}
	} catch (error) {
		throw new Error(`authorization error: ${(error as Error).message}`);
	}
};
export default authorize_user;
