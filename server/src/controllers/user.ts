import { Request, Response } from "express";
import { isUUID } from "validator";
import { CustomRequest } from "../interfaces/ICustomRequest";
import UserModel from "../models/user";

const user_model = new UserModel();
const index = async (_req: Request, res: Response) => {
	try {
		const users = await user_model.getAll();
		res.status(200).json(users);
	} catch (error) {
		res.status(404).json({ error: (error as Error).message });
	}
};

// get a user by id
const getUser = async (req: Request, res: Response) => {
	try {
		const { identifier } = req.params;
		if (!identifier) {
			return res.status(400).json({ error: "IDENTIFIER MUST BE PROVIDED! " });
		}
		const criteria: { [key: string]: string } = {};
		if (isUUID(identifier)) {
			criteria["user_id"] = identifier;
		} else {
			criteria["user_name"] = identifier;
		}
		const user = await user_model.getAUser(criteria);
		res.status(200).json(user);
	} catch (error) {
		res.status(404).json({ error: (error as Error).message });
	}
};

// update a user
const update = async (req: CustomRequest, res: Response) => {
	try {
		const { id } = req.params;

		// check of the user has the same id or it is admin
		if (req.user.id === id || req.user.is_admin) {
			const updated_user = await user_model.update(id, req.body);
			res.status(200).json(updated_user);
		} else {
			res
				.status(401)
				.json({ error: "You are not authorized to update this user" });
		}
	} catch (error) {
		res.status(404).json({
			error: ` Error in update user control: ${(error as Error).message}`,
		});
	}
};

// delete a user
const deleteUser = async (req: CustomRequest, res: Response) => {
	try {
		const { id } = req.params;
		// check of the user has the same id or it is admin
		if (req.user.id === id || req.user.is_admin) {
			const deleted_user = await user_model.delete(id);
			res.status(200).json(`the user of ${id} has deleted !`);
		} else {
			res
				.status(401)
				.json({ error: "You are not authorized to delete this user" });
		}
	} catch (error) {
		res.status(404).json({ error: (error as Error).message });
	}
};

export default {
	index,
	update,
	getUser,
	deleteUser,
};
