import { Router } from "express";
import likeController from "../../controllers/like";
import postController from "../../controllers/post";
import authorize_user from "../../middlewares/auth";
// create an instance of router
const postRoute: Router = Router();

postRoute.post("/create", authorize_user, postController.create);
postRoute.put("/update/:post_id", authorize_user, postController.update);
postRoute.post("/like/:post_id", authorize_user, likeController.handleLike);
postRoute.get("/all", postController.index);
postRoute.delete("/delete/:post_id", authorize_user, postController.deletePost);
postRoute.get("/user/:user_id", postController.userPosts);
postRoute.get("/feed", authorize_user, postController.feed);
postRoute.get("/:post_id", authorize_user, postController.getPostById);
export default postRoute;
