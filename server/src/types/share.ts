// ───── SHARE TYPES ──────────────────────────────

export type TShare = {
  share_id?: string;
  user_id: string;
  original_post_id: string;
  commentary: string | null;
  created_at?: Date;
};

export type TShareUser = {
  share_id?: string;
  user_id: string;
  user_name: string;
  first_name: string;
  last_name: string;
  picture: string;
  shared_at: Date;
};
