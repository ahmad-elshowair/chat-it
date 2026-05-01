import { Router } from 'express';
import auditController from '../../controllers/audit.controller.js';
import authorizeUser from '../../middlewares/auth.js';
import requirePermission from '../../middlewares/auth/requirePermission.js';
import { auditQueryValidator } from '../../middlewares/validations/audit.js';

const auditRoute: Router = Router();

auditRoute.get(
  '/',
  authorizeUser,
  requirePermission('audit.read'),
  auditQueryValidator,
  auditController.getAuditLogs,
);

export default auditRoute;
