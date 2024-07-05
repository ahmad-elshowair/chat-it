import { NextFunction, Request, Response } from "express";
import config from "../configs/config";
import { UserPayload } from "../interfaces/IUserPayload";
import AuthModel from "../models/auth";
import { generateToken } from "../utilities/generateToken";

const user_model = new AuthModel();

const createUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await user_model.create(req.body);
		const payload: UserPayload = {
			id: user.user_id,
			is_admin: user.is_admin,
		};
		const token = generateToken(payload, config.jwt_secret);

		res.status(201).json({
			user_id: user.user_id,
			user_name: user.user_name,
			isAdmin: user.is_admin,
			email: user.email,
			token,
		});
	} catch (error) {
		next(error);
	}
};

// login user
const loginUser = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const { email, password } = req.body;
	try {
		const user = await user_model.login(email, password);
		//check the user
		if (!user) {
			res.status(401).json({ error: "Invalid email or password" });
		}

		const payload: UserPayload = {
			id: user.user_id,
			is_admin: user.is_admin,
		};

		// generate access token
		const token = generateToken(payload, config.jwt_secret);

		res.status(200).json({
			user_id: user.user_id,
			username: user.user_name,
			email: user.email,
			isAdmin: user.is_admin,
			token,
		});
	} catch (error) {
		next(error);
	}
};

export default {
	createUser,
	loginUser,
};
