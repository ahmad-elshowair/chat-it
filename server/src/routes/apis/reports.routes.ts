import { Router } from 'express';
import reportsController from '../../controllers/reports.controller.js';
import authorizeUser from '../../middlewares/auth.js';
import requirePermission from '../../middlewares/auth/requirePermission.js';
import { contentCreationLimiter } from '../../middlewares/rateLimiter.js';
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
  reportsController.listReports,
);

reportRoute.patch(
  '/:id/dismiss',
  authorizeUser,
  requirePermission('reports.manage'),
  validateReportId,
  validateResolutionNote,
  reportsController.dismissReport,
);

reportRoute.patch(
  '/:id/resolve',
  authorizeUser,
  requirePermission('reports.manage'),
  validateReportId,
  validateResolutionNote,
  reportsController.resolveReport,
);

export default reportRoute;
