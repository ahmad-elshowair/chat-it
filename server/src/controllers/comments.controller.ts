import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import CommentModel from "../models/comments";
import { IComment } from "../types/comments";

const comment_model = new CommentModel();

const createComment = async (req: ICustomRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const user_id = req.user?.id!;
    const { post_id, content, parent_comment_id } = req.body;

    if (!user_id) {
      return res.status(401).json({ error: "User authentication required" });
    }

    const comment: IComment = {
      user_id,
      post_id,
      content,
      parent_comment_id: parent_comment_id || null,
    };
    const createdComment = await comment_model.create(comment);
    res.status(201).json({
      success: true,
      data: createdComment,
      message: "Comment created successfully",
    });
  } catch (error) {
    console.error("[CommentController]: createComment error: ", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while creating the comment",
      message: (error as Error).message,
    });
  }
};

const updateComment = async (req: ICustomRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const comment_id = req.params.comment_id;
    const content = req.body.content;
    const user_id = req.user?.id!;

    if (!user_id) {
      return res.status(401).json({ error: "User authentication required" });
    }

    try {
      const updatedComment = await comment_model.update(
        comment_id,
        content,
        user_id
      );
      res.status(200).json({
        success: true,
        data: updatedComment,
        message: "Comment updated successfully",
      });
    } catch (error) {
      if ((error as Error).message.includes("comment not found")) {
        return res.status(404).json({
          success: false,
          error: "Comment not found or you don't have permission to update it",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("[CommentController]: updateComment error: ", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while updating the comment",
      message: (error as Error).message,
    });
  }
};

const deleteComment = async (req: ICustomRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const comment_id = req.params.comment_id;
    const user_id = req.user?.id!;

    if (!user_id) {
      return res.status(401).json({ error: "User authentication required" });
    }

    try {
      const result = await comment_model.delete(comment_id, user_id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if ((error as Error).message.includes("comment not found")) {
        return res.status(404).json({
          success: false,
          error: "Comment not found or you don't have permission to delete it",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("[CommentController]: deleteComment error: ", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while deleting the comment",
      message: (error as Error).message,
    });
  }
};

const getCommentsByPostId = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const post_id = req.params.post_id;

    if (!post_id) {
      return res.status(400).json({ error: "Post ID is required" });
    }

    const comments = await comment_model.getCommentsByPostId(post_id);

    // ORGANIZE COMMENTS INTO HIERARCHICAL STRUCTURES.
    const topLevelComments = comments.filter(
      (comment) => !comment.parent_comment_id
    );
    const commentsReplies = comments.filter(
      (comment) => comment.parent_comment_id
    );
    res.status(200).json({
      success: true,
      data: { comments: topLevelComments, replies: commentsReplies },
      count: comments.length,
    });
  } catch (error) {
    console.error("[CommentController]: getCommentsByPostId error: ", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while fetching the comments",
      message: (error as Error).message,
    });
  }
};

const getRepliesByCommentId = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const comment_id = req.params.comment_id;

    if (!comment_id) {
      return res.status(400).json({ error: "Comment ID is required" });
    }

    const replies = await comment_model.getRepliesByCommentId(comment_id);
    res.status(200).json({
      success: true,
      data: replies,
      count: replies.length,
    });
  } catch (error) {
    console.error("[CommentController]: getRepliesByCommentId error: ", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while fetching the replies",
      message: (error as Error).message,
    });
  }
};

export default {
  createComment,
  deleteComment,
  getCommentsByPostId,
  getRepliesByCommentId,
  updateComment,
};
