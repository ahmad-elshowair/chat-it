import { Router } from "express";
import userController from "../../controllers/user";
import authorizeUser from "../../middlewares/auth";
const userRoute: Router = Router();

userRoute.get("/unknowns", authorizeUser, userController.getUnknownUsers);
userRoute.get("/", authorizeUser, userController.fetchAllUsers);
userRoute.get("/:user_name", userController.getUser);

userRoute.put("/update/:id", authorizeUser, userController.update);

userRoute.delete("/delete/:id", authorizeUser, userController.deleteUser);

userRoute.get("/online", authorizeUser, userController.getOnlineUsers);

export default userRoute;
