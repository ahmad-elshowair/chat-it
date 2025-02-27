export type TUser = {
  user_id?: string;
  user_name: string;
  email: string;
  password: string;
  picture?: string;
  cover?: string;
  is_admin?: boolean;
  bio?: string;
  city?: string;
  home_town?: string;
  created_at?: Date;
  updated_at?: Date;
  first_name: string;
  last_name: string;
  is_online?: boolean;
  marital_status?: string;
  number_of_followings?: number;
  number_of_followers?: number;
};
export type TRegisterCredentials = Omit<
  TUser,
  | "user_id"
  | "created_at"
  | "updated_at"
  | "picture"
  | "cover"
  | "is_admin"
  | "number_of_followers"
  | "number_of_followings"
  | "marital_status"
  | "home_town"
  | "city"
  | "bio"
  | "is_online"
>;

export type TOnlineUser = {
  user_id?: string;
  first_name?: string;
  picture?: string;
};

export type TOnlineFriendProps = {
  user_id?: string;
  picture?: string;
  first_name?: string;
};

export type TProfileRightBarProps = {
  bio?: string;
  city?: string;
  home_town?: string;
  marital_status?: string;
  user_id?: string;
};
