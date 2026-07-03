import { Router } from 'express';
import sharesController from '../../controllers/shares.controller.js';
import authorize_user from '../../middlewares/auth.js';
import { contentCreationLimiter } from '../../middlewares/rateLimiter.js';
import { idempotency } from '../../middlewares/idempotency.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import { paginationValidator } from '../../middlewares/validations/pagination.js';
import { validateShare, validateShareCreation } from '../../middlewares/validations/shares.js';

// ───── SHARE ROUTES ──────────────────────────────
const shareRoute: Router = Router();

shareRoute.get(
  '/is-shared/:post_id',
  authorize_user,
  validateShare,
  validationMiddleware,
  sharesController.checkShareStatus,
);

shareRoute.get(
  '/post/:post_id',
  authorize_user,
  validateShare,
  paginationValidator,
  validationMiddleware,
  sharesController.getPostSharers,
);

shareRoute.post(
  '/:post_id',
  authorize_user,
  contentCreationLimiter,
  idempotency,
  validateShareCreation,
  validationMiddleware,
  sharesController.sharePost,
);

shareRoute.delete(
  '/:post_id',
  authorize_user,
  contentCreationLimiter,
  validateShare,
  validationMiddleware,
  sharesController.unsharePost,
);

export default shareRoute;
