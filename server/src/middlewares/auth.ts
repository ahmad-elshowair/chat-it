import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../configs/config";
import { CustomRequest } from "../interfaces/CustomRequest";
import handleAnAuthorized from "../utilities/handleAnAuthorized";

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
				handleAnAuthorized(next);
			}
		} else {
			// no token provided
			handleAnAuthorized(next);
		}
	} catch (error) {
		handleAnAuthorized(next);
	}
};
