export type Like = {
  like_id?: string;
  user_id?: string;
  post_id: string;
  created_at?: Date;
};

export type TUsersLike = Like & {
  user_id?: string;
  first_name: string;
  last_name: string;
  picture: string;
  liked_at: Date;
};
