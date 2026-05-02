import { NextFunction, Response } from 'express';
import RoleModel from '../models/role.js';
import pool from '../database/pool.js';
import { emitAudit } from '../services/auditEmitter.js';
import permissionCache from '../services/permissionCache.js';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import { AppError } from '../utilities/appError.js';
import { sendResponse } from '../utilities/response.js';

const roleModel = new RoleModel();

/**
 * List all roles with their permission sets.
 * @route GET /api/roles
 * @returns 200 with array of roles
 */
const listRoles = async (_req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await roleModel.index();
    return sendResponse.success(res, roles, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * List all available permissions.
 * @route GET /api/roles/permissions
 * @returns 200 with array of permissions
 */
const listPermissions = async (_req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const permissions = await roleModel.getAllPermissions();
    return sendResponse.success(res, permissions, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new custom role with selected permissions.
 * @route POST /api/roles
 * @returns 201 with the created role, 400 on validation failure, 409 on duplicate
 */
const createRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, permissionIds } = req.body;
    const actorId = req.user?.id;

    if (!name || !description) {
      return sendResponse.error(res, 'name and description are required', 400);
    }

    if (!Array.isArray(permissionIds)) {
      return sendResponse.error(res, 'permissionIds must be an array', 400);
    }

    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const role = await roleModel.create(name, description, permissionIds, connection);

      await emitAudit({
        client: connection,
        actorId: actorId!,
        actorType: 'user',
        action: 'role.create',
        entityType: 'role',
        entityId: role.role_id,
        previousValues: null,
        newValues: { name: role.name, description: role.description, permissionIds },
        ipAddress: req.ip,
      });

      await connection.query('COMMIT');
      return sendResponse.success(res, role, 201);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (
      (error as Error).message.includes('duplicate key') ||
      (error as Error).message.includes('unique')
    ) {
      return next(new AppError('A role with this name already exists', 409));
    }
    next(error);
  }
};

/**
 * Update a custom role's description and permissions.
 * @route PUT /api/roles/:id
 * @returns 200 with updated role, 404 if not found
 */
const updateRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { description, permissionIds } = req.body;
    const actorId = req.user?.id;

    if (!description) {
      return sendResponse.error(res, 'description is required', 400);
    }

    if (!Array.isArray(permissionIds)) {
      return sendResponse.error(res, 'permissionIds must be an array', 400);
    }

    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const previousRole = await roleModel.getById(id, connection);
      const previousValues = {
        description: previousRole.description,
        permissionIds: previousRole.permissions.map((p) => p.permission_id),
      };

      const role = await roleModel.update(id, description, permissionIds, connection);

      await emitAudit({
        client: connection,
        actorId: actorId!,
        actorType: 'user',
        action: 'role.update',
        entityType: 'role',
        entityId: id,
        previousValues,
        newValues: { description, permissionIds },
        ipAddress: req.ip,
      });

      await connection.query('COMMIT');
      await permissionCache.invalidateAll();
      return sendResponse.success(res, role, 200);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if ((error as Error).message === 'Role not found') {
      return next(new AppError('Role not found', 404));
    }
    next(error);
  }
};

/**
 * Delete a custom role. System roles are protected at the DB trigger level.
 * @route DELETE /api/roles/:id
 * @returns 200 with confirmation, 404 if not found
 */
const deleteRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const actorId = req.user?.id;

    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const previousRole = await roleModel.getById(id, connection);
      const previousValues = {
        name: previousRole.name,
        description: previousRole.description,
        is_system: previousRole.is_system,
      };

      await roleModel.delete(id, connection);

      await emitAudit({
        client: connection,
        actorId: actorId!,
        actorType: 'user',
        action: 'role.delete',
        entityType: 'role',
        entityId: id,
        previousValues,
        newValues: null,
        ipAddress: req.ip,
      });

      await connection.query('COMMIT');
      await permissionCache.invalidateAll();
      return sendResponse.success(res, { message: 'Role deleted successfully' }, 200);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === 'Role not found') {
      return next(new AppError('Role not found', 404));
    }
    if (msg.includes('Cannot delete system-defined role')) {
      return next(new AppError('Cannot delete system-defined role', 403));
    }
    next(error);
  }
};

/**
 * Assign a role to a user.
 * @route POST /api/roles/:userId/assign
 * @returns 200 with the assignment record, 409 on duplicate
 */
const assignRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    const assignedBy = req.user?.id;

    if (!roleId) {
      return sendResponse.error(res, 'roleId is required', 400);
    }

    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const assignment = await roleModel.assignRole(userId, roleId, assignedBy!, connection);

      const assignedRole = await roleModel.getById(roleId, connection);

      await emitAudit({
        client: connection,
        actorId: assignedBy!,
        actorType: 'user',
        action: 'role.assign',
        entityType: 'user_role',
        entityId: userId,
        previousValues: null,
        newValues: {
          role_id: roleId,
          role_name: assignedRole.name,
          assigned_by: assignedBy,
        },
        ipAddress: req.ip,
      });

      await connection.query('COMMIT');
      await permissionCache.invalidate(userId);
      return sendResponse.success(res, assignment, 200);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if (
      (error as Error).message.includes('duplicate key') ||
      (error as Error).message.includes('unique')
    ) {
      return next(new AppError('User already has this role', 409));
    }
    next(error);
  }
};

/**
 * Revoke a role from a user. Prevents self-lockout of last super_admin.
 * @route POST /api/roles/:userId/revoke
 * @returns 200 with confirmation, 404 if assignment not found
 */
const revokeRole = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    const revokedBy = req.user?.id;

    if (!roleId) {
      return sendResponse.error(res, 'roleId is required', 400);
    }

    if (userId === revokedBy) {
      const superAdminRole = await roleModel.getByName('super_admin');
      if (superAdminRole && roleId === superAdminRole.role_id) {
        const hasOtherSuperAdmin = await checkNotLastSuperAdmin(userId, revokedBy);
        if (!hasOtherSuperAdmin) {
          return sendResponse.error(res, 'Cannot remove your last super_admin role', 403);
        }
      }
    }

    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');

      const revokedRole = await roleModel.getById(roleId, connection);
      const previousValues = {
        role_id: roleId,
        role_name: revokedRole.name,
      };

      const result = await roleModel.revokeRole(userId, roleId, connection);

      await emitAudit({
        client: connection,
        actorId: revokedBy!,
        actorType: 'user',
        action: 'role.revoke',
        entityType: 'user_role',
        entityId: userId,
        previousValues,
        newValues: null,
        ipAddress: req.ip,
      });

      await connection.query('COMMIT');
      await permissionCache.invalidate(userId);
      return sendResponse.success(res, result, 200);
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    if ((error as Error).message === 'Role assignment not found') {
      return next(new AppError('Role assignment not found', 404));
    }
    next(error);
  }
};

/**
 * Verify user retains at least one super_admin role after revocation (FR-013).
 * @param targetUserId - the user being modified
 * @param _actingUserId - the super admin performing the action
 * @returns true if safe to proceed (user keeps super_admin), false if lockout would occur
 */
const checkNotLastSuperAdmin = async (
  targetUserId: string,
  _actingUserId: string,
): Promise<boolean> => {
  const roles = await roleModel.getUserRoles(targetUserId);
  const superAdminCount = roles.filter((r) => r.name === 'super_admin').length;
  return superAdminCount > 1;
};

export default {
  listRoles,
  listPermissions,
  createRole,
  updateRole,
  deleteRole,
  assignRole,
  revokeRole,
};
