import { Request, Response } from "express";
import UserModel from "../models/user";

const user_model = new UserModel();
const index = async (req: Request, res: Response) => {
	try {
		const users = await user_model.getAll();
		res.status(200).json(users);
	} catch (error) {
		res.status(404).json({ error: (error as Error).message });
	}
};

// update a user
const update = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const updatedUser = await user_model.update(id, req.body);
		res.status(200).json({ ...updatedUser });
	} catch (error) {
		res.status(400).json({ error: (error as Error).message });
	}
};

export default {
	index,
	update,
};
