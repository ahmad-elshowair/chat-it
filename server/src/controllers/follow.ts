import { Response } from "express";
import { CustomRequest } from "../interfaces/ICustomRequest";
import FollowService from "../models/follow";

const followService = new FollowService();

// follow function
const follow = async (req: CustomRequest, res: Response) => {
  try {
    const user_id_following: string = req.user.id;
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

// get followings of a user
const getFollowings = async (req: CustomRequest, res: Response) => {
  try {
    const user_id_followed: string = req.user.id;
    // get the followings from the database
    const dbFollowings = await followService.getFollowings(user_id_followed);
    console.log(dbFollowings);
    res.status(200).json(dbFollowings);
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
    console.log(followers);

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
