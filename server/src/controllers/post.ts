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
    res.status(400).json({ error: (error as Error).message });
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
    res.status(400).json({ error: (error as Error).message });
  }
};

// get post by id
const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await postService.getById(req.params.id);
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// get all posts
const getAllPosts = async (req: Request, res: Response) => {
  try {
    const posts = await postService.getAll();
    res.status(200).json(posts);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// delete post
const deletePost = async (req: CustomRequest, res: Response) => {
  try {
    const post = await postService.getById(req.params.id);
    if (post.user_id === req.user.id) {
      const deletePost = await postService.delete(req.params.id);
      res.status(200).json(deletePost);
    } else {
      res.status(401).json({ message: "THAT IS NOT YOUR POST !" });
    }
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};
// GET ALL POSTS BY USER ID
const getAllByUserId = async (req: CustomRequest, res: Response) => {
  try {
    const posts: Post[] = await postService.getAllByUserId(req.user.id);
    res.status(200).json(posts);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// GET ALL POSTS OF A USER AND HIS FOLLOWINGS
const getAllByUserIdAndFollowings = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    const posts: Post[] = await postService.getAllByUserIdAndFollowing(
      req.user.id
    );
    res.status(200).json(posts);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export default {
  create,
  update,
  getPostById,
  getAllPosts,
  deletePost,
  getAllByUserId,
  getAllByUserIdAndFollowings,
};
