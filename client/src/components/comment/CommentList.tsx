import { FC, useEffect, useState } from "react";
import { useSecureApi } from "../../hooks/useSecureApi";
import { TComment, TCommentListProps } from "../../types/comments";
import Comment from "./Comment";
import CommentForm from "./CommentForm";
import "./comment.css";
import { TApiResponse } from "../../types/api";

const CommentList: FC<TCommentListProps> = ({ post_id }) => {
  const [comments, setComments] = useState<TComment[]>([]);

  const [replies, setReplies] = useState<TComment[]>([]);
  const [error, setError] = useState("");

  const { isLoading, get, post, put, del, error: apiError } = useSecureApi();

  useEffect(() => {
    const fetchComments = async () => {
      const response = await get<
        TApiResponse<{ comments: TComment[]; replies: TComment[] }>
      >(`/posts/${post_id}/comments`);

      if (response?.success) {
        const { comments: topLevelComments, replies: commentsReplies } =
          response.data;

        setComments(topLevelComments);
        setReplies(commentsReplies);
      }
    };
    fetchComments();
  }, [post_id, get]);

  useEffect(() => {
    if (apiError) {
      setError(apiError.getUserFriendlyMessage());
    } else {
      setError("");
    }
  }, [apiError]);

  const addComment = async (content: string) => {
    const response = await post<TApiResponse<TComment>>("/comments/create", {
      post_id: post_id,
      content: content,
    });
    if (response?.success && response.data) {
      setComments((prevComments: TComment[]) => [
        ...prevComments,
        response.data,
      ]);
    }
  };

  const addReply = async (comment_id: string, content: string) => {
    const response = await post<TApiResponse<TComment>>("/comments/create", {
      post_id: post_id,
      content: content,
      parent_comment_id: comment_id,
    });
    if (response?.success && response.data) {
      setReplies((prevReplies: TComment[]) => [...prevReplies, response.data]);
    }
  };

  const updateComment = async (comment_id: string, content: string) => {
    const response = await put<TApiResponse<TComment>>(
      `/comments/update/${comment_id}`,
      {
        content: content,
      }
    );
    if (response?.success && response.data) {
      const updatedComment = response.data;

      if (updatedComment.parent_comment_id) {
        setReplies((prevReplies) =>
          prevReplies.map((reply) =>
            reply.comment_id === comment_id ? updatedComment : reply
          )
        );
      } else {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.comment_id === comment_id ? updatedComment : comment
          )
        );
      }
    }
  };

  const deleteComment = async (comment_id: string) => {
    const response = await del<
      TApiResponse<{ success: boolean; message: string }>
    >(`/comments/delete/${comment_id}`);
    if (response?.success) {
      setComments((prevComments) =>
        prevComments.filter((comment) => comment.comment_id !== comment_id)
      );

      setReplies((prevReplies) =>
        prevReplies.filter((reply) => reply.parent_comment_id !== comment_id)
      );

      setReplies((prevReplies) =>
        prevReplies.filter((reply) => reply.comment_id !== comment_id)
      );
    }
  };

  return (
    <section className="comments-container">
      {isLoading && comments.length === 0 ? (
        <div className="text-center py-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading Comments...</span>{" "}
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : comments.length === 0 ? (
        <div className="text-center text-muted py-3">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="comments-list p-2 rounded-2">
          {comments.map((comment) => (
            <Comment
              key={comment.comment_id}
              comment={comment}
              onReply={addReply}
              onUpdate={updateComment}
              onDelete={deleteComment}
              replies={replies}
            />
          ))}
        </div>
      )}
      <div className="mt-3">
        <CommentForm onSubmit={addComment} />
      </div>
    </section>
  );
};

export default CommentList;
