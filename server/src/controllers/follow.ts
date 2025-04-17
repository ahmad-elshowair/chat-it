import { Response } from "express";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import FollowModel from "../models/follow";

const follow_model = new FollowModel();

const follow = async (req: ICustomRequest, res: Response) => {
  try {
    const user_id_following: string = req.user?.id!;
    const user_id_followed: string = req.body.user_id_followed;
    // check if the user different
    if (user_id_following !== user_id_followed) {
      const followAUser = await follow_model.follow(
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
      const unFollowAUser = await follow_model.unFollow(
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
    const numFollowings = await follow_model.getNumberOfFollowings(user_id);
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
    const numFollowers = await follow_model.getNumberOfFollowers(user_id);
    res.status(200).json(numFollowers);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
};

const getFollowings = async (req: ICustomRequest, res: Response) => {
  const user_id = req.user?.id!;
  try {
    const followings = await follow_model.getFollowings(user_id);
    res.status(200).json(followings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const getFollowers = async (req: ICustomRequest, res: Response) => {
  const user_id = req.user?.id!;
  try {
    const followers = await follow_model.getFollowers(user_id);
    res.status(200).json(followers);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const isFollowed = async (req: ICustomRequest, res: Response) => {
  const following_id: string = req.user?.id!;
  const followed_id = req.params.followed_id;

  try {
    const checkIsFollowed = await follow_model.checkIfFollowing(
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
  getFollowings,
  getFollowers,
  isFollowed,
};
