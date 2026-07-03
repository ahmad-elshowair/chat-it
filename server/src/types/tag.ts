export type TTag = {
  tag_id: string;
  name: string;
  post_count: number;
  created_at: Date;
  updated_at: Date;
};

export type TPostTag = {
  post_tag_id: string;
  post_id: string;
  tag_id: string;
  created_at: Date;
};
