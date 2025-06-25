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

export type TOnlineFriendProps = {
  user_id?: string;
  picture?: string;
  first_name?: string;
  user_name?: string;
};

export type TProfileRightBarProps = {
  bio?: string;
  city?: string;
  home_town?: string;
  marital_status?: string;
  user_id?: string;
};
export type UserPayload = {
  user_id?: string;
  user_name: string;
  email: string;
  picture?: string;
  cover?: string;
  is_admin?: boolean;
  bio?: string;
  city?: string;
  home_town?: string;
  updated_at?: Date;
  first_name: string;
  last_name: string;
  marital_status?: string;
  access_token: string;
  refresh_token: string;
};

export type TFriendsCardProps = {
  user_id?: string;
  picture?: string;
  first_name?: string;
  user_name?: string;
  is_online?: boolean;
};
