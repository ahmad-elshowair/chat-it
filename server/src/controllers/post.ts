import { Request, Response } from "express";
import { CustomRequest } from "../interfaces/ICustomRequest";
import PostModel from "../models/post";
import Post from "../types/post";

// create an instance of user model
const postService = new PostModel();

// create a post
const create = async (req: CustomRequest, res: Response) => {
	try {
		const post: Post = {
			user_id: req.user.id,
			description: req.body.description,
			image: req.body.image,
		};
		const createPost = await postService.create(post);
		res.status(201).json(createPost);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
};
// update a post
const update = async (req: CustomRequest, res: Response) => {
	try {
		// check if the user is the owner of this post
		const post = req.body;
		if (req.user.id === post.user_id) {
			const updatedPost = await postService.update(req.params.id, post);
			res.status(200).json(updatedPost);
		} else {
			res.status(401).json({ message: "THAT IS NOT YOUR POST !" });
		}
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
};

// get post by id
const aPost = async (req: Request, res: Response) => {
	try {
		const post = await postService.aPost(req.params.id);
		res.status(200).json(post);
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
};

// get all posts
const index = async (req: Request, res: Response) => {
	try {
		const posts = await postService.index();
		res.status(200).json(posts);
	} catch (error) {
		console.error("Error fetching posts:", error);
		res.status(500).json({ error: "An error occurred while fetching posts." });
	}
};

// delete post
const deletePost = async (req: CustomRequest, res: Response) => {
	try {
		const post = await postService.aPost(req.params.id);
		if (post.user_id === req.user.id) {
			const deletePost = await postService.delete(req.params.id);
			res.status(200).json(deletePost);
		} else {
			res.status(401).json({ message: "THAT IS NOT YOUR POST !" });
		}
	} catch (error) {
		res.status(500).json({ error: (error as Error).message });
	}
};
// GET ALL POSTS BY USER ID
const userPosts = async (req: CustomRequest, res: Response) => {
	try {
		const posts: Post[] = await postService.userPosts(req.user.id);

		res.status(200).json(posts);
	} catch (error) {
		console.error("Error fetching posts:", error);
		res.status(500).json({ error: "An error occurred while fetching posts." });
	}
};

// GET ALL POSTS OF A USER AND HIS FOLLOWINGS
const feed = async (req: CustomRequest, res: Response) => {
	try {
		const posts: Post[] = await postService.feed(req.user.id);

		res.status(200).json(posts);
	} catch (error) {
		console.error("Error fetching posts:", error);
		res.status(500).json({ error: "An error occurred while fetching posts." });
	}
};

export default {
	create,
	update,
	aPost,
	index,
	deletePost,
	userPosts,
	feed,
};
