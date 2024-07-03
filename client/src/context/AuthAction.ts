import { TLoginPayload } from "../types";

export const LoginStart = (user: TLoginPayload) => ({
	type: "LOGIN_START",
	payload: user,
});

export const LoginSuccess = (user: TLoginPayload) => ({
	type: "LOGIN_SUCCESS",
	payload: user,
});

export const LoginFailure = (error: Error) => ({
	type: "LOGIN_FAILURE",
	payload: error,
});
