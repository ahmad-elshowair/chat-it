import { Router } from 'express';
import {
  globalLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} from '../middlewares/rateLimiter.js';
import authentication from './apis/auth.routes.js';
import audit from './apis/audit.routes.js';
import bookmarks from './apis/bookmarks.routes.js';
import comments from './apis/comments.routes.js';
import follows from './apis/follow.routes.js';
import posts from './apis/posts.routes.js';
import reports from './apis/reports.routes.js';
import roles from './apis/roles.routes.js';
import search from './apis/search.routes.js';
import shares from './apis/shares.routes.js';
import tags from './apis/tags.routes.js';
import uploadRouter from './apis/upload.routes.js';
import users from './apis/users.routes.js';
const routes: Router = Router();

// Strict limiter on credential endpoints (brute-force protection)
routes.use('/auth/login', loginLimiter);
routes.use('/auth/register', registerLimiter);

// Dedicated refresh limiter keyed by cookie hash
routes.use('/auth/refresh-token', refreshLimiter);

// Global limiter for everything
routes.use(globalLimiter);

// Route groups (logout and is-authenticated fall under global limiter only)
routes.use('/auth', authentication);
routes.use('/audit', audit);
routes.use('/users', users);
routes.use('/posts', posts);
routes.use('/bookmarks', bookmarks);
routes.use('/comments', comments);
routes.use('/follows', follows);
routes.use('/reports', reports);
routes.use('/roles', roles);
routes.use('/search', search);
routes.use('/shares', shares);
routes.use('/tags', tags);
routes.use('/upload', uploadRouter);

export default routes;
