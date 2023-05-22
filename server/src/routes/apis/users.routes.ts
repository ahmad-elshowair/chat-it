import { Router } from "express";
import authController from "../../controllers/auth";
import userController from "../../controllers/user";
import { validationMiddleware } from "../../middlewares/validation";
import userValidation from "../../middlewares/validations/user";

const userRoute: Router = Router();

userRoute.get("/", userController.getUsers);
userRoute.post(
	"/register",
	userValidation.register,
	validationMiddleware,
	authController.createUser,
);
userRoute.post(
	"/login",
	userValidation.login,
	validationMiddleware,
	authController.loginUser,
);

export default userRoute;
