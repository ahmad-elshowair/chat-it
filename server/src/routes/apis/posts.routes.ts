import { Router } from "express";
import likeController from "../../controllers/like";
import postController from "../../controllers/post";
import authorize_user from "../../middlewares/auth";
// create an instance of router
const postRoute: Router = Router();

postRoute.post("/create", authorize_user, postController.create);
postRoute.put("/update/:id", authorize_user, postController.update);
postRoute.post("/like/:id", authorize_user, likeController.handleLike);
postRoute.get("/find", postController.getAllPosts);
postRoute.get("/find/:id", postController.getPostById);
postRoute.delete("/delete/:id", authorize_user, postController.deletePost);
postRoute.get("/user/:id", authorize_user, postController.getAllByUserId);
export default postRoute;
