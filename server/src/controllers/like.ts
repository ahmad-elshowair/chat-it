import { Response } from "express";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import LikeModel from "../models/like";
import { Like } from "../types/like";

// create an instance of LikeModel
const likeService = new LikeModel();

// like post arrow function
const handleLike = async (req: ICustomRequest, res: Response) => {
  try {
    const like: Like = {
      user_id: req.user?.id!,
      post_id: req.params.post_id,
    };
    const isLiked = await likeService.like(like);
    res.status(200).json(isLiked);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export default {
  handleLike,
};
