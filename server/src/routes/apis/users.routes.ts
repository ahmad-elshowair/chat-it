import { Router } from 'express';
import userController from '../../controllers/users.controller.js';
import authorizeUser from '../../middlewares/auth.js';
import { idempotency } from '../../middlewares/idempotency.js';
import { validationMiddleware } from '../../middlewares/validation.js';
import { paginationValidator } from '../../middlewares/validations/pagination.js';
import {
  validateDeleteUser,
  validateGetFriends,
  validateGetUserByUsername,
  validateGetUsers,
  validateUpdateUser,
} from '../../middlewares/validations/user.js';
const userRoute: Router = Router();

userRoute.get('/unknowns', authorizeUser, userController.getUnknownUsers);
userRoute.get('/', authorizeUser, validateGetUsers, validationMiddleware, userController.getUsers);

userRoute.get(
  '/:user_name',
  authorizeUser,
  validateGetUserByUsername,
  validationMiddleware,
  userController.getUserByUsername,
);

userRoute.put(
  '/update/:user_id',
  authorizeUser,
  idempotency,
  validateUpdateUser,
  validationMiddleware,
  userController.update,
);

userRoute.delete(
  '/delete/:user_id',
  authorizeUser,
  validateDeleteUser,
  validationMiddleware,
  userController.deleteUser,
);

userRoute.get(
  '/friends/:user_id',
  authorizeUser,
  validateGetFriends,
  paginationValidator,
  validationMiddleware,
  userController.getFriends,
);

export default userRoute;
