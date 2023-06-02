import { Router } from "express";
import postController from "../../controllers/post";
import authorize_user from "../../middlewares/auth";
const postRoute: Router = Router();

postRoute.post("/create", authorize_user, postController.create);
postRoute.put("/update/:id", authorize_user, postController.update);

export default postRoute;
