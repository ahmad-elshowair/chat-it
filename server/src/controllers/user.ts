import { NextFunction, Request, Response } from "express";
import UserModel from "../models/user";

const user_model = new UserModel();

const getUsers = async (req: Request, res: Response) => {
	try {
		const users = await user_model.getAll();
		res.status(200).json(users);
	} catch (error) {
		res.status(400).json({ error: (error as Error).message });
	}
};

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
	const { user_email, user_password } = req.body;
	try {
		const user = await user_model.login(user_email, user_password);
		//check the user
		if (!user) {
			res.status(401).json({ error: "Invalid email or password" });
		}
		res.status(200).json({
			name: user.user_name,
			email: user.user_email,
			admin: user.is_admin,
		});
	} catch (error) {
		next(error);
	}
};

export default {
	getUsers,
	createUser,
	loginUser,
};
