import { AxiosError } from "axios";
import { createContext, FC, useState } from "react";

import api from "../api/axiosInstance";
import { getCsrf, syncAllAuthTokensFromCookies } from "../services/storage";
import { TPost, TPostContext } from "../types/post";

export const PostContext = createContext<TPostContext | undefined>(undefined);

export const PostProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [posts, setPosts] = useState<TPost[]>([]);

  const addPost = (newPost: TPost) => {
    setPosts((prevPosts) => [newPost, ...prevPosts]);
  };

  const refreshPosts = async (user_id?: string) => {
    syncAllAuthTokensFromCookies();

    const csrf = getCsrf();
    if (!csrf) {
      console.error("CSRF token not found");
      return;
    }

    try {
      const response = user_id
        ? await api.get(`/posts/user/${user_id}`, {
            withCredentials: true,
            headers: { "X-CSRF-Token": csrf },
          })
        : await api.get(`/posts/feed`, {
            withCredentials: true,
            headers: { "X-CSRF-Token": csrf },
          });

      setPosts(response.data.data);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error("Error data:", axiosError.response.data);
        console.error("Error status:", axiosError.response.status);
      }
    }
  };

  const removePost = (post_id: string) => {
    setPosts((prevPosts) =>
      prevPosts.filter((post) => post.post_id !== post_id)
    );
  };

  return (
    <PostContext.Provider
      value={{
        posts,
        setPosts,
        addPost,
        refreshPosts,
        removePost,
      }}
    >
      {children}
    </PostContext.Provider>
  );
};
