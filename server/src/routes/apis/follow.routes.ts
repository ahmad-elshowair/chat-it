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
	followController.follow,
);

followRouter.get(
	"/num-followings",
	authorize_user,
	followController.getNumberOfFollowings,
);

followRouter.get(
	"/num-followers",
	authorize_user,
	followController.getNumberOfFollowers,
);

followRouter.get("/friends", authorize_user, followController.getFriends);

followRouter.get("/followings", authorize_user, followController.getFollowings);

followRouter.get("/followers", authorize_user, followController.getFollowers);

export default followRouter;
