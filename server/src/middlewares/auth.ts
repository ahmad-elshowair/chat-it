import { NextFunction, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../configs/config";
import { CustomRequest } from "../interfaces/ICustomRequest";

const authorize_user = (
	req: CustomRequest,
	res: Response,
	next: NextFunction,
) => {
	try {
		const headerAuth = req.headers["authorization"];
		if (headerAuth) {
			const token = headerAuth.split(" ")[1];
			const bearer = headerAuth.split(" ")[0].toLowerCase();
			if (token && bearer === "bearer") {
				const decoded: string | JwtPayload = jwt.verify(
					token,
					config.jwt_secret,
				);
				if (typeof decoded === "object" && "id" in decoded) {
					req.user = decoded;
					next();
				} else {
					return res.status(401).json({
						error: "Invalid Token",
					});
				}
			} else {
				// invalid token
				return res.status(401).json({
					error: "Invalid Token Or Bearer",
				});
			}
		} else {
			// no token provided
			return res.status(401).json({
				error: "No Token Provided",
			});
		}
	} catch (error) {
		next(error);
	}
};
export default authorize_user;
