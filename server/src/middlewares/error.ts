import { NextFunction, Request, Response } from "express";
import { Error } from "../interfaces/IError";
const errorMiddleware = (
	error: Error,
	_req: Request,
	res: Response,
	next: NextFunction,
) => {
	const status = error.status || 500;
	const message = error.message || "SOMETHING WENT WRONG !";
	res.status(status).json({ status, message });
	next();
};

export default errorMiddleware;
