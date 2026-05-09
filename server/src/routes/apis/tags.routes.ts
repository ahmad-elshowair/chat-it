import { Router } from 'express';
import { trending, search, postsByTag } from '../../controllers/tagController.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import { tagSearchLimiter } from '../../middlewares/rateLimiter.js';
import {
  tagNameValidator,
  tagSearchValidator,
  tagPaginationValidator,
  trendingValidator,
} from '../../middlewares/validations/tags.js';

const tagsRoute: Router = Router();

tagsRoute.get('/trending', tagSearchLimiter, trendingValidator, validationMiddleware, trending);

tagsRoute.get('/search', tagSearchLimiter, tagSearchValidator, validationMiddleware, search);

tagsRoute.get(
  '/:name/posts',
  tagNameValidator,
  tagPaginationValidator,
  validationMiddleware,
  postsByTag,
);

export default tagsRoute;
