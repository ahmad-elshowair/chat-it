import { AxiosError } from "axios";
import { FC, useEffect, useState } from "react";
import { AiFillLike } from "react-icons/ai";
import { BiLike, BiSolidLike } from "react-icons/bi";
import { FaComments, FaRegComment, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import api from "../../api/axiosInstance";
import config from "../../configs";
import useAuthState from "../../hooks/useAuthState";
import {
  getCsrf,
  syncAllAuthTokensFromCookies,
  syncCsrfFromCookies,
} from "../../services/storage";
import { TPost } from "../../types/post";
import { TUser } from "../../types/user";
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
    likes: number_of_likes,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { user: currentUser } = useAuthState();

  useEffect(() => {
    const checkIfLiked = async () => {
      if (!currentUser?.user_id || !post_id) return;

      try {
        const response = await api.get(`/posts/is-liked/${post_id}`);
        const { data } = response.data;
        if (data.isLiked) {
          setLikeState((prevState) => ({
            ...prevState,
            isLiked: true,
          }));
        }
      } catch (error) {
        console.error(`Failed to check if post is liked: ${error}`);
      }
    };
    checkIfLiked();
  }, [post_id, currentUser?.user_id]);

  useEffect(() => {
    const fetchAUser = async () => {
      try {
        const response = await api.get(`/users/${user_name}`);
        setUser(response.data.data);
      } catch (error) {
        console.error(`Failed to fetch user: ${error}`);
      }
    };
    fetchAUser();
  }, [user_name]);

  // FORMATE THE DATE
  const date: Date = new Date(updated_at as Date);
  const dateFormate = date.toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const likeHandler = async () => {
    setLikeState((pervState) => ({
      ...pervState,
      isLiked: !pervState.isLiked,
      likes: pervState.isLiked ? pervState.likes - 1 : pervState.likes + 1,
    }));

    try {
      syncAllAuthTokensFromCookies();
      // GET CSRF FROM SESSION STORAGE.
      const csrfToken = getCsrf();

      if (!csrfToken) {
        console.error("CSRF token not found");
        throw new Error("Missing CSRF token");
      }
      await api.post(
        `/posts/like/${post_id}`,
        {},
        {
          withCredentials: true,
          headers: {
            "X-CSRF-Token": csrfToken,
          },
        }
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error("Error data:", axiosError.response.data);
        console.error("Error status:", axiosError.response.status);
      }

      //IF IT'S A CSRF MISMATCH, TRY ONE MORE WITH SYNCING THE TOKENS FROM COOKIES
      if (
        axiosError.response?.status === 403 &&
        typeof axiosError.response.data === "object" &&
        axiosError.response.data &&
        (axiosError.response.data as any).error === "CSRF token mismatch!"
      ) {
        try {
          syncCsrfFromCookies();
          const newCsrfToken = getCsrf();
          if (newCsrfToken) {
            await api.post(
              `/posts/like/${post_id}`,
              {},
              {
                withCredentials: true,
                headers: {
                  "X-CSRF-Token": newCsrfToken,
                },
              }
            );
          }
          return;
        } catch (retryError) {
          console.error("Retry failed: ", retryError);
        }
      }

      // IF IT'S NOT A CSRF MISMATCH, JUST TOGGLE THE LIKE
      setLikeState((prevState) => ({
        ...prevState,
        isLiked: !prevState.isLiked,
        likes: prevState.isLiked ? prevState.likes - 1 : prevState.likes + 1,
      }));
    }
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
                {dateFormate}
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
            >
              {likeState.isLiked ? (
                <AiFillLike className="like" />
              ) : (
                <BiLike className="like" />
              )}
            </button>
            <button type="button">
              <FaRegComment className="comment" />
            </button>
          </div>
        </article>
      </div>
      <DeletePostModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        post_id={post_id}
      />
    </section>
  );
};
