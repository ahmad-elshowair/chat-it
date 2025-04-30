export interface IComment {
  comment_id?: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  parent_comment_id?: string | null;
  first_name?: string;
  last_name?: string;
  picture?: string;
}
