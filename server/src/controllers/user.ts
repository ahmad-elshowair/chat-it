import { Request, Response } from "express";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import FollowModel from "../models/follow";
import UserModel from "../models/user";

const user_model = new UserModel();
const follow_model = new FollowModel();

const fetchAllUsers = async (req: ICustomRequest, res: Response) => {
  try {
    const users = await user_model.index();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// get a user by id
const getUser = async (req: Request, res: Response) => {
  try {
    const user = await user_model.getAUser(req.params.user_name);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// update a user
const update = async (req: ICustomRequest, res: Response) => {
  try {
    const { id } = req.params;

    // check of the user has the same id or it is admin
    if (req.user?.id === id || req.user?.is_admin) {
      const updated_user = await user_model.update(id, req.body);
      res.status(200).json(updated_user);
    } else {
      res
        .status(401)
        .json({ error: "You are not authorized to update this user" });
    }
  } catch (error) {
    res.status(404).json({
      error: ` Error in update user control: ${(error as Error).message}`,
    });
  }
};

// delete a user
const deleteUser = async (req: ICustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    // check of the user has the same id or it is admin
    if (req.user?.id === id || req.user?.is_admin) {
      const deleted_user = await user_model.delete(id);
      res
        .status(200)
        .json(`${deleted_user.user_name} has deleted successfully !`);
    } else {
      res
        .status(401)
        .json({ error: "You are not authorized to delete this user" });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// GET ALL OTHER USERS
const getUnknownUsers = async (req: ICustomRequest, res: Response) => {
  const user_id = req.user?.id;
  try {
    const unknowns = await user_model.getUnknowns(user_id!);
    res.status(200).json(unknowns);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const getFriends = async (req: Request, res: Response) => {
  const user_id = req.params.user_id;
  const is_online = req.query.is_online === "true";
  if (!user_id) {
    return res.status(400).json({
      error: "User ID is required",
    });
  }
  try {
    const friends = await user_model.getFriends(user_id, is_online);
    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message,
    });
  }
};

export default {
  fetchAllUsers,
  update,
  getUser,
  deleteUser,
  getUnknownUsers,
  getFriends,
};
