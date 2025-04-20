import { AxiosError } from "axios";
import { FC, useEffect } from "react";
import api from "../../api/axiosInstance";
import useAuthState from "../../hooks/useAuthState";
import { usePost } from "../../hooks/usePost";
import { TFeedProps } from "../../types/post";
import { Post } from "../post/Post";
import { Share } from "../share/Share";
import "./feed.css";

export const Feed: FC<TFeedProps> = ({ user_id }) => {
  const { isAuthChecked, user: currentUser } = useAuthState();
  const { posts, setPosts } = usePost();

  useEffect(() => {
    if (!isAuthChecked) return;

    const fetchFeed = async () => {
      try {
        const response = user_id
          ? await api.get(`/posts/user/${user_id}`)
          : await api.get(`/posts/feed`);

        setPosts(response.data);
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error("Error data:", axiosError.response.data);
          console.error("Error status:", axiosError.response.status);
        }
      }
    };

    fetchFeed();
  }, [isAuthChecked, user_id, setPosts]);
  return (
    <section className="feed">
      {(!user_id || user_id === currentUser?.user_id) && <Share />}
      {posts.length > 0 &&
        posts.map((post) => <Post key={post.post_id} {...post} />)}
    </section>
  );
};
