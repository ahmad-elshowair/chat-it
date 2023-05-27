import { NextFunction, Request, Response } from "express";
import AuthModel from "../models/auth";

const user_model = new AuthModel();

const createUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await user_model.create(req.body);
		res.status(201).json({ ...user });
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
		res.status(200).json({
			name: user.user_name,
			email: user.email,
			admin: user.is_admin,
		});
	} catch (error) {
		next(error);
	}
};

export default {
	createUser,
	loginUser,
};
