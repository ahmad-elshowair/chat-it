import { Router } from 'express';
import { contentCreationLimiter } from '../../middlewares/rateLimiter.js';
import commentController from '../../controllers/comments.controller.js';
import authorize_user from '../../middlewares/auth.js';
import { idempotency } from '../../middlewares/idempotency.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import {
  createCommentValidator,
  deleteCommentValidator,
  getRepliesByCommentIdValidator,
  updateCommentValidator,
} from '../../middlewares/validations/comments.js';

const router = Router();

// ───── CONTENT CREATION & MODIFICATION ROUTES (RATE LIMITED) ────────────────────────

router.post(
  '/create',
  authorize_user,
  contentCreationLimiter,
  idempotency,
  createCommentValidator,
  validationMiddleware,
  commentController.createComment,
);

router.put(
  '/update/:comment_id',
  authorize_user,
  contentCreationLimiter,
  idempotency,
  updateCommentValidator,
  validationMiddleware,
  commentController.updateComment,
);

router.delete(
  '/delete/:comment_id',
  authorize_user,
  contentCreationLimiter,
  deleteCommentValidator,
  validationMiddleware,
  commentController.deleteComment,
);

// ───── CONTENT RETRIEVAL ROUTES ──────────────────────

router.get(
  '/:comment_id/replies',
  authorize_user,
  getRepliesByCommentIdValidator,
  validationMiddleware,
  commentController.getRepliesByCommentId,
);

export default router;
