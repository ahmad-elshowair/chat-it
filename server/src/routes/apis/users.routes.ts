import { Router } from "express";
import control from "../../controllers/user";
import { validationMiddleware } from "../../middlewares/validation";
import userValidation from "../../middlewares/validations/user";

const userRoute: Router = Router();

userRoute.get("/", control.getUsers);
userRoute.post(
	"/register",
	validationMiddleware,
	userValidation.register,
	control.createUser,
);

export default userRoute;
