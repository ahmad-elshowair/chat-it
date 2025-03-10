export type RefreshToken = {
  user_id?: string;
  fingerprint_hash?: string;
  expires_at?: Date;
  token_id: string;
  is_revoked?: boolean;
  revoked_at?: Date | null;
  created_at?: Date;
};
