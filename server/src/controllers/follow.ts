import { Request, Response } from "express";
import FollowService from "../models/follow";

const followService = new FollowService();

// follow a user function
const followUser = async (req: Request, res: Response) => {
	const follower_id = req.params.id;
	const followed_id = req.body.followed_id;
	if (follower_id !== followed_id) {
		try {
			const followAUser = await followService.addFollow(
				follower_id,
				followed_id,
			);
			res.status(201).json({
				message: "User Followed Successfully",
				followAUser,
			});
		} catch (error) {
			res.status(500).json({
				error: (error as Error).message,
			});
		}
	} else {
		res.status(403).json("YOU CANNOT FOLLOW YOURSELF !");
	}
};

// delete follow function
const deleteFollow = async (req: Request, res: Response) => {
	const follower_id = req.params.id;
	const followed_id = req.body.followed_id;
	if (follower_id !== followed_id) {
		try {
			const deleteFollow = await followService.deleteFollow(
				follower_id,
				followed_id,
			);
			res.status(201).json({
				message: "User Deleted Successfully",
				deleteFollow,
			});
		} catch (error) {
			res.status(500).json({
				error: (error as Error).message,
			});
		}
	} else {
		res.status(403).json("YOU CANNOT UNFOLLOW YOURSELF !");
	}
};

export default {
	followUser,
	deleteFollow,
};
