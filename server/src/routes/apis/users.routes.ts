import { Router } from "express";
import authController from "../../controllers/auth";
import userController from "../../controllers/user";
import authorize_user from "../../middlewares/auth";
import { validationMiddleware } from "../../middlewares/validation";
import {
	loginValidation,
	registerValidation,
} from "../../middlewares/validations/user";
const userRoute: Router = Router();

userRoute.get("/unknowns", authorize_user, userController.getUnknownUsers);
userRoute.get("/", authorize_user, userController.index);
userRoute.get("/:user_name", userController.getUser);
userRoute.post(
	"/register",
	registerValidation,
	validationMiddleware,
	authController.createUser,
);
userRoute.post(
	"/login",
	loginValidation,
	validationMiddleware,
	authController.loginUser,
);
userRoute.put("/update/:id", authorize_user, userController.update);

userRoute.delete("/delete/:id", authorize_user, userController.deleteUser);

export default userRoute;
