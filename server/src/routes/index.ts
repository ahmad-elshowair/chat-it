import { Router } from "express";
import users from "./apis/users.routes";

const routes: Router = Router();

routes.use("/users", users);

export default routes;
