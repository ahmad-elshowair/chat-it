import { Dispatch } from "react";
import { UserPayload } from "./user";

export type AuthResponse = {
  message: string;
  user: UserPayload;
  fingerprint?: string;
  csrf?: string;
  access_token: string;
  refresh_token: string;
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
        user: UserPayload;
        access_token: string;
        refresh_token: string;
        fingerprint?: string;
        csrf?: string;
      };
    }
  | { type: "LOGOUT" };

export type AuthState = {
  user: UserPayload | null;
  loading: boolean;
  errors: string[] | null;
  fingerprint?: string;
  csrf?: string;
};

export interface Store {
  dispatch: Dispatch<AuthAction>;
}
