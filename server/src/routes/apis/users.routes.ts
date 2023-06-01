import { Router } from "express";
import authController from "../../controllers/auth";
import followController from "../../controllers/follow";
import userController from "../../controllers/user";
import authorize_user from "../../middlewares/auth";
import { validationMiddleware } from "../../middlewares/validation";
import followValidation from "../../middlewares/validations/follow";
import userValidation from "../../middlewares/validations/user";
const userRoute: Router = Router();

userRoute.get("/", userController.index);
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
userRoute.put("/update/:id", authorize_user, userController.update);

userRoute.delete("/delete/:id", authorize_user, userController.deleteUser);
userRoute.post(
	"/follow",
	followValidation.checkFollow,
	validationMiddleware,
	followController.followUser,
);
userRoute.delete(
	"/unfollow",
	followValidation.checkFollow,
	validationMiddleware,
	followController.deleteFollow,
);
export default userRoute;
