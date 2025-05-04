import AuthModel from "../models/auth";
import CommentModel from "../models/comments";
import FollowModel from "../models/follow";
import LikeModel from "../models/like";
import PostModel from "../models/post";
import RefreshTokenModel from "../models/refreshToken";
import UserModel from "../models/user";

const post_model = new PostModel();
const user_model = new UserModel();
const comment_model = new CommentModel();
const like_model = new LikeModel();
const follow_model = new FollowModel();
const auth_model = new AuthModel();
const refresh_token_model = new RefreshTokenModel();

export {
  auth_model,
  comment_model,
  follow_model,
  like_model,
  post_model,
  refresh_token_model,
  user_model,
};
