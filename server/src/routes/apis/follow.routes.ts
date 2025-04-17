import { Router } from "express";
import followController from "../../controllers/follow";
import authorize_user from "../../middlewares/auth";
import followValidation from "../../middlewares/validations/follow";

// create an instance of Router for follow

const followRouter = Router();

followRouter.post(
  "/follow",
  authorize_user,
  followValidation.checkFollow,
  followController.follow
);

followRouter.delete(
  "/unfollow",
  authorize_user,
  followValidation.checkFollow,
  followController.unFollow
);

followRouter.get(
  "/num-followings",
  authorize_user,
  followController.getNumberOfFollowings
);

followRouter.get(
  "/num-followers",
  authorize_user,
  followController.getNumberOfFollowers
);

followRouter.get("/followings", authorize_user, followController.getFollowings);

followRouter.get("/followers", authorize_user, followController.getFollowers);

followRouter.get(
  "/is-followed/:followed_id",
  authorize_user,
  followController.isFollowed
);

export default followRouter;
