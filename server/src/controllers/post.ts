import { Request, Response } from "express";
import { CustomRequest } from "../interfaces/ICustomRequest";
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

const update = async (req: CustomRequest, res: Response) => {
	try {
		// check if the user logged in
		if (req.user) {
			// check if the user is the owner of this post
			const post = req.body;
			if (req.user.id === post.user_id) {
				const updatedPost = await postService.update(req.params.id, post);
				res.status(200).json(updatedPost);
			} else {
				res.status(401).json({ message: "THAT IS NOT YOUR POST !" });
			}
		} else {
			res.status(401).json({ message: "YOU ARE NOT LOGGED IN !" });
		}
	} catch (error) {
		res.status(400).json({ error: (error as Error).message });
	}
};

// get post by id arrow function
const getPostById = async (req: Request, res: Response) => {
	try {
		const post = await postService.getById(req.params.id);
		res.status(200).json(post);
	} catch (error) {
		res.status(400).json({ error: (error as Error).message });
	}
};

// get all posts

export default {
	create,
	update,
	getPostById,
};
