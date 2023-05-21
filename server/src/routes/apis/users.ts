import { Router } from "express";
import control from "../../controllers/user";

const userRoute: Router = Router();

userRoute.get("/", control.getUsers);

export default userRoute;
