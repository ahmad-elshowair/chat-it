import { Response } from "express";
import { CustomRequest } from "../interfaces/CustomRequest";
import PostModel from "../models/post";
const postService = new PostModel();

const create = async (req: CustomRequest, res: Response) => {
	try {
		// check if the user logged in
		if (req.user) {
			const post = await postService.create(req.body);
			res.status(201).json(post);
		} else {
			res
				.status(401)
				.json({ message: "You are not authorized to create post" });
		}
	} catch (error) {
		res.status(400).json({ error: (error as Error).message });
	}
};

export default {
	create,
};
