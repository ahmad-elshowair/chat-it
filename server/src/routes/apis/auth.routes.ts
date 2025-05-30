import { Router } from "express";
import authController from "../../controllers/auth.controller";
import authorizeUser from "../../middlewares/auth";
import { validationMiddleware } from "../../middlewares/validation";
import {
  loginValidation,
  registerValidation,
} from "../../middlewares/validations/userAuth";

const authRouter = Router();

authRouter.post(
  "/register",
  registerValidation,
  validationMiddleware,
  authController.register
);

authRouter.post(
  "/login",
  loginValidation,
  validationMiddleware,
  authController.login
);

authRouter.post("/refresh-token", authController.refreshToken);
authRouter.post("/logout", authorizeUser, authController.logout);
authRouter.get(
  "/is-authenticated",
  authorizeUser,
  authController.checkAuthStatus
);
export default authRouter;
