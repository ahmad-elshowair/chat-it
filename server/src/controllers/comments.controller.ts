import { NextFunction, Request, Response } from 'express';
import { ICustomRequest } from '../interfaces/ICustomRequest.js';
import CommentModel from '../models/comments.js';
import { IComment } from '../types/comments.js';
import { AppError } from '../utilities/appError.js';
import { sendResponse } from '../utilities/response.js';

const comment_model = new CommentModel();

const createComment = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'User Authentication Required', 401);
    }

    const { post_id, content, parent_comment_id } = req.body;

    const comment: IComment = {
      user_id,
      post_id,
      content,
      parent_comment_id: parent_comment_id || null,
    };
    const createdComment = await comment_model.create(comment);
    return sendResponse.success<IComment>(res, createdComment, 201);
  } catch (error) {
    next(error);
  }
};

const updateComment = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return sendResponse.error(res, 'User authentication required', 401);
    }

    const commentId = req.params.comment_id;
    const { content } = req.body;

    try {
      const updatedComment = await comment_model.update(commentId, content, user_id);
      return sendResponse.success<IComment>(res, updatedComment, 200);
    } catch (error) {
      if ((error as Error).message.includes('comment not found')) {
        throw new AppError("Comment not found or you don't have permission to update it", 404);
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req: ICustomRequest, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return sendResponse.error(res, 'User authentication required', 401);
    }

    const commentId = req.params.comment_id;

    try {
      const deletedComment = await comment_model.delete(commentId, user_id);
      return sendResponse.success(res, deletedComment.message);
    } catch (error) {
      if ((error as Error).message.includes('comment not found')) {
        throw new AppError("Comment not found or you don't have permission to delete it", 404);
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const getCommentsByPostId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post_id = req.params.post_id;

    const comments = await comment_model.getCommentsByPostId(post_id);

    const topLevelComments = comments.filter((comment) => !comment.parent_comment_id);
    const commentsReplies = comments.filter((comment) => comment.parent_comment_id);
    return sendResponse.success<{
      comments: IComment[];
      replies: IComment[];
    }>(
      res,
      {
        comments: topLevelComments,
        replies: commentsReplies,
      },
      200,
    );
  } catch (error) {
    next(error);
  }
};

const getRepliesByCommentId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment_id = req.params.comment_id;

    const replies = await comment_model.getRepliesByCommentId(comment_id);
    return sendResponse.success<IComment[]>(res, replies, 200);
  } catch (error) {
    next(error);
  }
};

export default {
  createComment,
  deleteComment,
  getCommentsByPostId,
  getRepliesByCommentId,
  updateComment,
};
