import { Router } from "express";
import commentsController from "../../controllers/comments.controller";
import likeController from "../../controllers/likes.controller";
import postController from "../../controllers/posts.controller";
import authorize_user from "../../middlewares/auth";
import { getCommentsByPostIdValidator } from "../../middlewares/validations/comments";
import { validateLikeAction } from "../../middlewares/validations/likes";
import { paginationValidator } from "../../middlewares/validations/pagination";
import {
  createPostValidator,
  deletePostValidator,
  getPostByIdValidator,
  updatePostValidator,
  userPostsValidator,
} from "../../middlewares/validations/posts";

const postRoute: Router = Router();

postRoute.post(
  "/create",
  authorize_user,
  createPostValidator,
  postController.create
);

postRoute.put(
  "/update/:post_id",
  authorize_user,
  updatePostValidator,
  postController.update
);

postRoute.post(
  "/like/:post_id",
  authorize_user,
  validateLikeAction,
  likeController.handleLike
);

postRoute.get(
  "/is-liked/:post_id",
  authorize_user,
  validateLikeAction,
  likeController.checkIfLiked
);

postRoute.get(
  "/all",
  authorize_user,
  paginationValidator,
  postController.index
);

postRoute.delete(
  "/delete/:post_id",
  authorize_user,
  deletePostValidator,
  postController.deletePost
);

postRoute.get(
  "/user/:user_id",
  authorize_user,
  paginationValidator,
  userPostsValidator,
  postController.userPosts
);

postRoute.get(
  "/feed",
  authorize_user,
  paginationValidator,
  postController.feed
);

postRoute.get(
  "/:post_id",
  authorize_user,
  getPostByIdValidator,
  postController.getPostById
);

postRoute.get(
  "/:post_id/comments",
  authorize_user,
  getCommentsByPostIdValidator,
  commentsController.getCommentsByPostId
);
export default postRoute;
