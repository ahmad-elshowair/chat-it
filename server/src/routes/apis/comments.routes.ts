import { Router } from "express";
import commentController from "../../controllers/comments";
import authorize_user from "../../middlewares/auth";
import {
  createCommentValidator,
  deleteCommentValidator,
  getRepliesByCommentIdValidator,
  updateCommentValidator,
} from "../../middlewares/validations/comments";

const router = Router();

router.post(
  "/create",
  authorize_user,
  createCommentValidator,
  commentController.createComment
);

router.put(
  "/update/:comment_id",
  authorize_user,
  updateCommentValidator,
  commentController.updateComment
);

router.delete(
  "/delete/:comment_id",
  authorize_user,
  deleteCommentValidator,
  commentController.deleteComment
);

router.get(
  "/:comment_id/replies",
  authorize_user,
  getRepliesByCommentIdValidator,
  commentController.getRepliesByCommentId
);

export default router;
