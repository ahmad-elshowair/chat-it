import { Response } from "express";
import { CustomRequest } from "../interfaces/CustomRequest";
import FollowService from "../models/follow";

const followService = new FollowService();

// follow a user function
const followUser = async (req: CustomRequest, res: Response) => {
	const { follower_id, followed_id } = req.body;
	// check if the user logged in
	if (!req.user) {
		return res.status(401).json({
			message: "You must be logged in to follow a user.",
		});
	}
	// check if the user is following the user
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
const deleteFollow = async (req: CustomRequest, res: Response) => {
	const { follower_id, followed_id } = req.body;

	// check if the user logged in
	if (!req.user) {
		return res.status(401).json({
			message: "You must be logged in to unfollow a user.",
		});
	}
	// check if the user is following the user
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
