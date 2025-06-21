import { AxiosError } from "axios";
import { createContext, FC, useCallback, useState } from "react";

import { useSecureApi } from "../hooks/useSecureApi";
import { getCsrf, syncAllAuthTokensFromCookies } from "../services/storage";
import { TPagination, TPost, TPostContext } from "../types/post";

export const PostContext = createContext<TPostContext | undefined>(undefined);

export const PostProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [posts, setPosts] = useState<TPost[]>([]);
  const [pagination, setPagination] = useState<TPagination>({
    hasMore: false,
    nextCursor: undefined,
    previousCursor: undefined,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const addPost = (newPost: TPost) => {
    setPosts((prevPosts) => [newPost, ...prevPosts]);
  };

  const { get } = useSecureApi();
  const refreshPosts = useCallback(
    async (
      user_id?: string,
      cursor?: string,
      append?: boolean,
      limit?: number
    ) => {
      setIsLoading(true);

      syncAllAuthTokensFromCookies();

      const csrf = getCsrf();
      if (!csrf) {
        console.error("CSRF token not found");
        setIsLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();

        if (cursor) params.append("cursor", cursor);
        if (limit) params.append("limit", limit.toString());

        const queryString = params.toString() ? `?${params.toString()}` : "";

        const endpoint = user_id
          ? `/posts/user/${user_id}${queryString}`
          : `/posts/feed${queryString}`;

        const response = await get<{
          data: TPost[];
          pagination: TPagination;
        }>(endpoint);

        console.log("the response of feed or user's posts: ", response);
        if (!response?.data) {
          console.error("Failed to fetch posts");
          setIsLoading(false);
          return;
        }

        const { data, pagination: paginationData } = response;

        if (append && cursor) {
          setPosts((prevPosts) => {
            const existingPostIds = new Set(
              prevPosts.map((post) => post.post_id)
            );

            const uniquePosts = data.filter(
              (post: TPost) => !existingPostIds.has(post.post_id)
            );

            const duplicatesCount = data.length - uniquePosts.length;
            if (duplicatesCount > 0) {
              console.log(`Filtered out ${duplicatesCount} duplicate posts`);
            }

            return [...prevPosts, ...uniquePosts];
          });
        } else {
          setPosts(data);
        }

        setPagination(paginationData);
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error("Error data:", axiosError.response.data);
          console.error("Error status:", axiosError.response.status);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [get]
  );

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
        pagination,
        isLoading,
        addPost,
        refreshPosts,
        removePost,
      }}
    >
      {children}
    </PostContext.Provider>
  );
};
