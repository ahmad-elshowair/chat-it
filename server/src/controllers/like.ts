import { Response } from "express";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import LikeModel from "../models/like";
import { Like } from "../types/like";

// create an instance of LikeModel
const like_model = new LikeModel();

const handleLike = async (req: ICustomRequest, res: Response) => {
  try {
    const like: Like = {
      user_id: req.user?.id!,
      post_id: req.params.post_id,
    };
    const isLiked = await like_model.like(like);
    res.status(200).json(isLiked);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

const checkIfLiked = async (req: ICustomRequest, res: Response) => {
  try {
    const user_id = req.user?.id!;

    const post_id = req.params.post_id;
    if (!user_id) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const result = await like_model.checkIfLiked(user_id, post_id);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export default {
  handleLike,
  checkIfLiked,
};
