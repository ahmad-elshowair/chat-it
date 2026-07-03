export interface IFeedPost {
  post_id?: string;
  description?: string;
  updated_at?: Date;
  image?: string;
  number_of_likes?: number;
  number_of_comments?: number;
  user_id?: string;
  user_name?: string;
  picture?: string;
  first_name?: string;
  last_name?: string;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_shared?: boolean;
  number_of_shares?: number;
  type?: 'post' | 'share';
  activity_id?: string;
  activity_at?: Date;
  shared_by_user_id?: string | null;
  shared_by_user_name?: string | null;
  share_commentary?: string | null;
  tags?: string[];
}
