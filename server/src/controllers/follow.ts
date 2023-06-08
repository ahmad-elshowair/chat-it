import { Response } from "express";
import { CustomRequest } from "../interfaces/ICustomRequest";
import FollowService from "../models/follow";

const followService = new FollowService();

// follow function
const follow = async (req: CustomRequest, res: Response) => {
	const follower_id: string = req.user.id;
	const followed_id: string = req.body.followed_id;

	try {
		// check if the user different
		if (follower_id !== followed_id) {
			const followAUser = await followService.follow(follower_id, followed_id);
			res.status(201).json(followAUser);
		} else {
			res.status(403).json("YOU CANNOT FOLLOW YOURSELF !");
		}
	} catch (error) {
		res.status(500).json({
			error: (error as Error).message,
		});
	}
};

// get followings of a user
const getFollowings = async (req: CustomRequest, res: Response) => {
	const follower_id: string = req.user.id;
	try {
		const followings = await followService.getFollowings(follower_id);
		res.status(200).json(followings);
	} catch (error) {
		res.status(500).json({
			error: (error as Error).message,
		});
	}
};

// get all the followers of a user
const getFollowers = async (req: CustomRequest, res: Response) => {
	const followed_id: string = req.user.id;
	try {
		const followers = await followService.getFollowers(followed_id);
		res.status(200).json(followers);
	} catch (error) {
		res.status(500).json({
			error: (error as Error).message,
		});
	}
};

export default {
	follow,
	getFollowings,
	getFollowers,
};
