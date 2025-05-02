export type Follow = {
  follow_id?: string;
  follower_id: string;
  followed_id: string;
  created_at: Date;
};

export type TFollowings = {
  user_id?: string;
  user_name?: string;
  first_name?: string;
  last_name?: string;
  picture?: string;
  cover?: string;
  bio?: string;
  number_of_followers?: number;
  number_of_followings?: number;
  created_at?: Date;
};

export type TFollowers = TFollowings;
