export interface IUserPayload {
  id?: string;
  is_admin?: boolean;
  fingerprint?: string;
  exp?: number;
  iat?: number;
  jti?: string;
}
