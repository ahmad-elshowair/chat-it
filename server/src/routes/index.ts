import { Router } from "express";
import follows from "./apis/follow.routes";
import posts from "./apis/posts.routes";
import uploadRouter from "./apis/upload.routes";
import users from "./apis/users.routes";
const routes: Router = Router();

routes.use("/users", users);
routes.use("/posts", posts);
routes.use("/follows", follows);
routes.use("/upload", uploadRouter);
export default routes;
