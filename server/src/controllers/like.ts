import { Response } from "express";
import { CustomRequest } from "../interfaces/CustomRequest";
import LikeModel from "../models/like";
import Like from "../types/like";

// create an instance of LikeModel
const likeService = new LikeModel();

// like post arrow function
const like = async (req: CustomRequest, res: Response) => {
	try {
		const like: Like = {
			user_id: req.user.id,
			post_id: req.params.id,
		};
		const addLike = await likeService.addLike(like);
		res.status(200).json(addLike);
	} catch (error) {
		res.status(400).json({ error: (error as Error).message });
	}
};

export default {
	like,
};
