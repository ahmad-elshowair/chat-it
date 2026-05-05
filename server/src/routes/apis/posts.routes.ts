import { Router } from 'express';
import { contentCreationLimiter } from '../../middlewares/rateLimiter.js';
import commentsController from '../../controllers/comments.controller.js';
import likeController from '../../controllers/likes.controller.js';
import postController from '../../controllers/posts.controller.js';
import authorize_user from '../../middlewares/auth.js';
import { idempotency } from '../../middlewares/idempotency.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import { getCommentsByPostIdValidator } from '../../middlewares/validations/comments.js';
import { validateLikeAction } from '../../middlewares/validations/likes.js';
import { paginationValidator } from '../../middlewares/validations/pagination.js';
import {
  createPostValidator,
  deletePostValidator,
  getPostByIdValidator,
  updatePostValidator,
  userPostsValidator,
} from '../../middlewares/validations/posts.js';

// ───── POSTS ROUTES ──────────────────────────────
const postRoute: Router = Router();

// Content Creation & Modification Routes (Rate limited)

postRoute.post(
  '/create',
  authorize_user,
  contentCreationLimiter,
  idempotency,
  createPostValidator,
  validationMiddleware,
  postController.create,
);

postRoute.put(
  '/update/:post_id',
  authorize_user,
  contentCreationLimiter,
  idempotency,
  updatePostValidator,
  validationMiddleware,
  postController.update,
);

postRoute.post(
  '/like/:post_id',
  authorize_user,
  contentCreationLimiter,
  idempotency,
  validateLikeAction,
  validationMiddleware,
  likeController.handleLike,
);

postRoute.delete(
  '/delete/:post_id',
  authorize_user,
  contentCreationLimiter,
  deletePostValidator,
  validationMiddleware,
  postController.deletePost,
);

// ───── POST RETRIEVAL ROUTES ──────────────────────

postRoute.get(
  '/is-liked/:post_id',
  authorize_user,
  validateLikeAction,
  validationMiddleware,
  likeController.checkIfLiked,
);

postRoute.get(
  '/all',
  authorize_user,
  paginationValidator,
  validationMiddleware,
  postController.index,
);

postRoute.get(
  '/user/:user_id',
  authorize_user,
  paginationValidator,
  userPostsValidator,
  validationMiddleware,
  postController.userPosts,
);

postRoute.get(
  '/feed',
  authorize_user,
  paginationValidator,
  validationMiddleware,
  postController.feed,
);

postRoute.get(
  '/:post_id',
  authorize_user,
  getPostByIdValidator,
  validationMiddleware,
  postController.getPostById,
);

postRoute.get(
  '/:post_id/comments',
  authorize_user,
  getCommentsByPostIdValidator,
  validationMiddleware,
  commentsController.getCommentsByPostId,
);
export default postRoute;
