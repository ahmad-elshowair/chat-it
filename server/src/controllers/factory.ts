import AuthModel from "../models/auth";
import CommentModel from "../models/comments";
import FollowModel from "../models/follow";
import LikeModel from "../models/like";
import PostModel from "../models/post";
import UserModel from "../models/user";

const post_model = new PostModel();
const user_model = new UserModel();
const comment_model = new CommentModel();
const like_model = new LikeModel();
const follow_model = new FollowModel();
const auth_model = new AuthModel();

export {
  auth_model,
  comment_model,
  follow_model,
  like_model,
  post_model,
  user_model,
};
