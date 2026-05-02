import { Router } from 'express';
import rolesController from '../../controllers/roles.controller.js';
import authorizeUser from '../../middlewares/auth.js';
import { idempotency } from '../../middlewares/idempotency.js';
import requirePermission from '../../middlewares/auth/requirePermission.js';

const rolesRoute: Router = Router();

rolesRoute.get('/', authorizeUser, requirePermission('roles.manage'), rolesController.listRoles);

rolesRoute.get(
  '/permissions',
  authorizeUser,
  requirePermission('roles.manage'),
  rolesController.listPermissions,
);

rolesRoute.post('/', authorizeUser, requirePermission('roles.manage'), idempotency, rolesController.createRole);

rolesRoute.put(
  '/:id',
  authorizeUser,
  requirePermission('roles.manage'),
  idempotency,
  rolesController.updateRole,
);

rolesRoute.delete(
  '/:id',
  authorizeUser,
  requirePermission('roles.manage'),
  rolesController.deleteRole,
);

rolesRoute.post(
  '/:userId/assign',
  authorizeUser,
  requirePermission('roles.assign'),
  idempotency,
  rolesController.assignRole,
);

rolesRoute.post(
  '/:userId/revoke',
  authorizeUser,
  requirePermission('roles.assign'),
  idempotency,
  rolesController.revokeRole,
);

export default rolesRoute;
