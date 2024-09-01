import { Router } from "express";
import authController from "../../controllers/auth";
import { validationMiddleware } from "../../middlewares/validation";
import {
	loginValidation,
	registerValidation,
} from "../../middlewares/validations/user";

const authRouter = Router();

authRouter.post(
	"/register",
	registerValidation,
	validationMiddleware,
	authController.register,
);

authRouter.post(
	"/login",
	loginValidation,
	validationMiddleware,
	authController.login,
);

authRouter.post("/refresh-token", authController.refreshToken);
authRouter.post("/logout", authController.logout);
export default authRouter;
