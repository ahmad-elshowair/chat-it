import { Router } from "express";
import userController from "../../controllers/user";
import authorize_user from "../../middlewares/auth";
const userRoute: Router = Router();

userRoute.get("/unknowns", authorize_user, userController.getUnknownUsers);
userRoute.get("/", authorize_user, userController.index);
userRoute.get("/:user_name", userController.getUser);

userRoute.put("/update/:id", authorize_user, userController.update);

userRoute.delete("/delete/:id", authorize_user, userController.deleteUser);

export default userRoute;
