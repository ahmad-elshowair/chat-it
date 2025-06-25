export type TPost = {
  post_id?: string;
  user_id?: string;
  description?: string;
  image?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  number_of_likes: number;
  number_of_comments: number;
  user_name?: string;
};

export type DeletePostModalProps = {
  post_id?: string;
  show: boolean;
  onHide: () => void;
};

export type TModalPostProps = {
  show: boolean;
  handleClose: () => void;
};

export type TPagination = {
  hasMore: boolean;
  nextCursor?: string;
  previousCursor?: string;
};

export type TPostContext = {
  posts: TPost[];
  setPosts: (posts: TPost[]) => void;
  addPost: (newPost: TPost) => void;
  refreshPosts: (
    user_id?: string,
    cursor?: string,
    append?: boolean,
    limit?: number
  ) => Promise<void>;
  pagination: TPagination;
  isLoading: boolean;
  removePost: (post_id: string) => void;
};

export type TFeedProps = {
  user_id?: string;
  cursor?: string;
  append?: boolean;
};
