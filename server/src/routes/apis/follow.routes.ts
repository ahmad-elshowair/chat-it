import { Router } from 'express';
import followController from '../../controllers/follows.controller.js';
import authorize_user from '../../middlewares/auth.js';
import { idempotency } from '../../middlewares/idempotency.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import {
  validateFollowAction,
  validateIsFollowedAction,
} from '../../middlewares/validations/follow.js';
import { paginationValidator } from '../../middlewares/validations/pagination.js';

const followRouter = Router();

followRouter.post(
  '/follow',
  authorize_user,
  idempotency,
  validateFollowAction,
  validationMiddleware,
  followController.followUser,
);

followRouter.delete(
  '/unfollow',
  authorize_user,
  validateFollowAction,
  validationMiddleware,
  followController.unFollowUser,
);

followRouter.get('/num-followings', authorize_user, followController.getNumberOfFollowings);

followRouter.get('/num-followers', authorize_user, followController.getNumberOfFollowers);

followRouter.get(
  '/followings',
  authorize_user,
  paginationValidator,
  validationMiddleware,
  followController.getFollowings,
);

followRouter.get(
  '/followers',
  authorize_user,
  paginationValidator,
  validationMiddleware,
  followController.getFollowers,
);

followRouter.get(
  '/is-followed/:followed_id',
  authorize_user,
  validateIsFollowedAction,
  validationMiddleware,
  followController.isFollowed,
);

export default followRouter;
