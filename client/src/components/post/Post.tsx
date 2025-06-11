import { FC, useEffect, useState } from "react";
import { AiFillLike } from "react-icons/ai";
import { BiLike, BiSolidLike } from "react-icons/bi";
import { FaComments, FaRegComment, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import config from "../../configs";
import useAuthState from "../../hooks/useAuthState";
import { useSecureApi } from "../../hooks/useSecureApi";
import { TPost } from "../../types/post";
import { TUser } from "../../types/user";
import { formatRelativeTime } from "../../utils/dateUtils";
import CommentList from "../comment/CommentList";
import DeletePostModal from "../deletePostModal/DeletePostModal";
import "./post.css";

export const Post: FC<TPost> = ({
  user_name,
  description,
  image,
  number_of_comments,
  number_of_likes,
  updated_at,
  post_id,
}) => {
  const [user, setUser] = useState<TUser | null>(null);
  const [likeState, setLikeState] = useState({
    isLiked: false,
    likes: number_of_likes || 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const { user: currentUser } = useAuthState();
  const { get, post, isLoading } = useSecureApi();

  useEffect(() => {
    const checkIfLiked = async () => {
      if (!currentUser?.user_id || !post_id) return;

      try {
        const response = await get<{
          success: boolean;
          data: { isLiked: boolean };
        }>(`/posts/is-liked/${post_id}`);

        if (response?.success && response.data.isLiked) {
          setLikeState((prevState) => ({
            ...prevState,
            isLiked: true,
          }));
        }
      } catch (error) {
        console.error(`Failed to check if post is liked: `, error);
      }
    };
    checkIfLiked();
  }, [post_id, currentUser?.user_id, get]);

  useEffect(() => {
    const fetchAUser = async () => {
      try {
        const response = await get<{ success: boolean; data: TUser }>(
          `/users/${user_name}`
        );

        if (response?.success) {
          setUser(response.data);
        }
      } catch (error) {
        console.error(`Failed to fetch user: ${error}`);
      }
    };
    fetchAUser();
  }, [user_name, get]);

  // FORMATE THE DATE
  const updatedAtDate = updated_at ? new Date(updated_at) : new Date();

  const relativeDate = formatRelativeTime(updatedAtDate);

  const likeHandler = async () => {
    setLikeState((pervState) => ({
      ...pervState,
      isLiked: !pervState.isLiked,
      likes: pervState.isLiked ? pervState.likes - 1 : pervState.likes + 1,
    }));

    try {
      const response = await post<{ success: boolean }>(
        `/posts/like/${post_id}`,
        {}
      );

      if (response?.success) {
        setLikeState((pervState) => ({
          ...pervState,
          isLiked: !pervState.isLiked,
          likes: pervState.isLiked ? pervState.likes + 1 : pervState.likes - 1,
        }));
      }
    } catch (error) {
      console.error(`Failed to like/unlike post: `, error);

      // IF IT'S NOT A CSRF MISMATCH, JUST TOGGLE THE LIKE
      setLikeState((prevState) => ({
        ...prevState,
        isLiked: !prevState.isLiked,
        likes: prevState.isLiked ? prevState.likes + 1 : prevState.likes - 1,
      }));
    }
  };

  const toggleComments = () => {
    setShowComments((prev) => !prev);
  };

  return (
    <section className="post card mt-2 mb-3">
      <div className="card-body">
        <article className="post-header">
          <div className="post-header-info">
            <figure>
              <Link to={`/profile/${user?.user_name}`}>
                <img
                  className="post-header-img-user"
                  src={
                    user?.picture
                      ? `${config.api_url}/images/avatars/${user.picture}`
                      : `${config.api_url}/images/no-avatar.png`
                  }
                  alt="profile"
                />
              </Link>
            </figure>
            <div className="post-header-info-links">
              <Link
                className="post-header-info-links-user text-capitalize"
                to={`/profile/${user?.user_name}`}
                rel="noopener noreferrer"
              >
                {`${user?.first_name} ${user?.last_name}`}
              </Link>
              <a href="#profile" className="post-header-info-links-date">
                {relativeDate}
              </a>
            </div>
          </div>
          <div className="post-header-option-bars">
            {currentUser?.user_id === user?.user_id && (
              <button
                type="button"
                className="btn"
                onClick={() => setShowDeleteModal(true)}
              >
                <FaTrash className="post-header-option-bars-icon text-danger" />
              </button>
            )}
          </div>
        </article>
        <article className="post-body">
          <p className="post-body-description">{description}</p>
          <figure className="post-body-images">
            {image && (
              <img className="post-body-images-image" src={image} alt="post" />
            )}
          </figure>
        </article>
        <article className="post-statistics">
          <span className="post-statistics-icon">
            {likeState.likes > 0 && (
              <>
                <BiSolidLike className="likes me-2" />
                <span className="post-statistics-number">
                  {likeState.likes} people like it{" "}
                </span>
              </>
            )}
          </span>
          <span className="post-statistics-icon">
            {number_of_comments > 0 && (
              <>
                <span className="post-statistics-number">
                  {number_of_comments}
                </span>
                <span className="post-statistics-number"> comments</span>
                <FaComments className="comments ms-2" />
              </>
            )}
          </span>
        </article>
        <hr className="m-2" />
        <article className="post-footer pb-1">
          <div className="post-footer-icons">
            <button
              type="button"
              onClick={likeHandler}
              aria-label={likeState.isLiked ? "Unlike Post" : "Like post"}
              disabled={isLoading}
            >
              {likeState.isLiked ? (
                <section className="d-flex align-items-center gap-2 justify-content-center">
                  <AiFillLike className="like-icon" />
                  <span className="text-muted">Liked</span>
                </section>
              ) : (
                <section className="d-flex align-items-center gap-2 justify-content-center">
                  <BiLike className="like-icon" />
                  <span className="text-muted">Like</span>
                </section>
              )}
            </button>
            <button
              type="button"
              onClick={toggleComments}
              aria-label="Show comments"
            >
              <section className="d-flex align-items-center gap-2 justify-content-center">
                <FaRegComment className="comment-icon" />
                <span className="text-muted">Comment</span>
              </section>
            </button>
          </div>
        </article>
        {showComments && (
          <article className="post-comments p-2 border-top">
            <CommentList post_id={post_id} />
          </article>
        )}
      </div>
      <DeletePostModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        post_id={post_id}
      />
    </section>
  );
};
