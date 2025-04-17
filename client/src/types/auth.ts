import { Dispatch } from "react";
import { TUserPayload } from "./user";

export type TAuth = {
  user: TUserPayload;
  access_token: string;
  refresh_token: string;
  fingerprint?: string;
  csrf?: string;
};

export type AuthResponse = {
  message?: string;
  user: TUserPayload;
  fingerprint?: string;
  csrf?: string;
  access_token?: string;
  refresh_token?: string;
};
export type LoginCredentials = {
  email?: string;
  password?: string;
};
export type RegisterCredentials = {
  user_name: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};
export type AuthAction =
  | { type: "START" }
  | { type: "SUCCEEDED"; payload: AuthResponse }
  | { type: "FAILURE"; payload: string[] }
  | {
      type: "REFRESH_TOKEN";
      payload: {
        user: TUserPayload;
        access_token?: string;
        refresh_token?: string;
        fingerprint?: string;
        csrf?: string;
      };
    }
  | { type: "LOGOUT" }
  | { type: "CHECK_AUTH_STATUS"; payload: boolean };

export type AuthState = {
  user: TUserPayload | null;
  loading: boolean;
  errors: string[] | null;
  fingerprint?: string;
  csrf?: string;
  authChecked?: boolean;
};

export interface Store {
  dispatch: Dispatch<AuthAction>;
}
