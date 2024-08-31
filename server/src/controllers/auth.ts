import { NextFunction, Request, Response } from "express";
import config from "../configs/config";
import { UserPayload } from "../interfaces/IUserPayload";
import AuthModel from "../models/auth";
import { generateToken } from "../utilities/generateToken";

const user_model = new AuthModel();

const register = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await user_model.register(req.body);
		const payload: UserPayload = {
			id: user.user_id,
			is_admin: user.is_admin,
		};
		const token = generateToken(payload, config.jwt_secret);

		res.status(201).json({
			user_id: user.user_id,
			user_name: user.user_name,
			email: user.email,
			picture: user.picture,
			cover: user.cover,
			is_admin: user.is_admin,
			bio: user.bio,
			city: user.city,
			home_town: user.home_town,
			updated_at: user.updated_at,
			first_name: user.first_name,
			last_name: user.last_name,
			marital_status: user.marital_status,
			token: token,
		});
	} catch (error) {
		next(error);
	}
};

// login user
const login = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const { email, password } = req.body;
	try {
		const user = await user_model.login(email, password);

		const payload: UserPayload = {
			id: user.user_id,
			is_admin: user.is_admin,
		};

		// generate access token
		const token = generateToken(payload, config.jwt_secret);

		res.status(200).json({
			user_id: user.user_id,
			user_name: user.user_name,
			email: user.email,
			picture: user.picture,
			cover: user.cover,
			is_admin: user.is_admin,
			bio: user.bio,
			city: user.city,
			home_town: user.home_town,
			updated_at: user.updated_at,
			first_name: user.first_name,
			last_name: user.last_name,
			marital_status: user.marital_status,
			token: token,
		});
	} catch (error) {
		next(error);
	}
};

export default {
	register,
	login,
};
