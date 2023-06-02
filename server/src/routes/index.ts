import { Router } from "express";
import posts from "./apis/posts.routes";
import users from "./apis/users.routes";
const routes: Router = Router();

routes.use("/users", users);
routes.use("/posts", posts);

export default routes;
