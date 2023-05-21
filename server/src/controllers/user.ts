import { Request, Response } from "express";
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

export default {
	getUsers,
};
