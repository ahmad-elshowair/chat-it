import { Router } from 'express';
import reportsController from '../../controllers/reports.controller.js';
import authorizeUser from '../../middlewares/auth.js';
import requirePermission from '../../middlewares/auth/requirePermission.js';
import { contentCreationLimiter } from '../../middlewares/rateLimiter.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import {
  validateCreateReport,
  validateReportId,
  validateResolutionNote,
  validateReportListQuery,
} from '../../middlewares/validations/reports.js';

// ───── REPORT ROUTES ──────────────────────────────
const reportRoute: Router = Router();

reportRoute.post(
  '/',
  authorizeUser,
  contentCreationLimiter,
  validateCreateReport,
  validationMiddleware,
  reportsController.createReport,
);

reportRoute.get(
  '/stats',
  authorizeUser,
  requirePermission('reports.manage'),
  reportsController.getReportStats,
);

reportRoute.get(
  '/',
  authorizeUser,
  requirePermission('reports.manage'),
  validateReportListQuery,
  validationMiddleware,
  reportsController.listReports,
);

reportRoute.patch(
  '/:id/dismiss',
  authorizeUser,
  requirePermission('reports.manage'),
  validateReportId,
  validateResolutionNote,
  validationMiddleware,
  reportsController.dismissReport,
);

reportRoute.patch(
  '/:id/resolve',
  authorizeUser,
  requirePermission('reports.manage'),
  validateReportId,
  validateResolutionNote,
  validationMiddleware,
  reportsController.resolveReport,
);

export default reportRoute;
