import { Response } from "express";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import FollowService from "../models/follow";

const followService = new FollowService();

const follow = async (req: ICustomRequest, res: Response) => {
  try {
    const user_id_following: string = req.user?.id!;
    const user_id_followed: string = req.body.user_id_followed;
    // check if the user different
    if (user_id_following !== user_id_followed) {
      const followAUser = await followService.follow(
        user_id_following,
        user_id_followed
      );
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

const unFollow = async (req: ICustomRequest, res: Response) => {
  try {
    const user_id_following: string = req.user?.id!;
    const user_id_followed: string = req.body.user_id_followed;
    // check if the user different
    if (user_id_following !== user_id_followed) {
      const unFollowAUser = await followService.unFollow(
        user_id_following,
        user_id_followed
      );
      res.status(201).json(unFollowAUser);
    } else {
      res.status(403).json("YOU CANNOT UNFOLLOW YOURSELF !");
    }
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
};

const getNumberOfFollowings = async (req: ICustomRequest, res: Response) => {
  try {
    const user_id: string = req.user?.id!;
    // get the followings from the database
    const numFollowings = await followService.getNumberOfFollowings(user_id);
    res.status(200).json(numFollowings);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
};

const getNumberOfFollowers = async (req: ICustomRequest, res: Response) => {
  const user_id: string = req.user?.id!;
  try {
    const numFollowers = await followService.getNumberOfFollowers(user_id);
    res.status(200).json(numFollowers);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
};

const getFriends = async (req: ICustomRequest, res: Response) => {
  const user_id = req.params.user_id;
  if (!user_id) {
    return res.status(400).json({
      error: "User ID is required",
    });
  }
  try {
    const friends = await followService.getFriends(user_id);
    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
};

const getFollowings = async (req: ICustomRequest, res: Response) => {
  const user_id = req.user?.id!;
  try {
    const followings = await followService.getFollowings(user_id);
    res.status(200).json(followings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const getFollowers = async (req: ICustomRequest, res: Response) => {
  const user_id = req.user?.id!;
  try {
    const followers = await followService.getFollowers(user_id);
    res.status(200).json(followers);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const isFollowed = async (req: ICustomRequest, res: Response) => {
  const following_id: string = req.user?.id!;
  const followed_id = req.params.followed_id;

  try {
    const checkIsFollowed = await followService.checkIfFollowing(
      following_id,
      followed_id
    );
    res.status(200).json(checkIsFollowed);
  } catch (error) {
    console.error("Error checking follow status:", error);
    res.status(500).json({ error: (error as Error).message });
  }
};

export default {
  follow,
  unFollow,
  getNumberOfFollowings,
  getNumberOfFollowers,
  getFriends,
  getFollowings,
  getFollowers,
  isFollowed,
};
