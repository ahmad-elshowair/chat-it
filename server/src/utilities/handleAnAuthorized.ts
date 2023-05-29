import { NextFunction } from "express";
import { Error } from "../interfaces/error";

const handleAnAuthorized = (next: NextFunction) => {
	const error: Error = new Error();
	error.status = 401;
	next(error);
};

export default handleAnAuthorized;
