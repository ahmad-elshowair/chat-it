import { TLogin } from "../types";

export const LoginStart = () => ({
	type: "LOGIN_START",
});

export const LoginSuccess = (user: TLogin) => ({
	type: "LOGIN_SUCCESS",
	payload: user,
});

export const LoginFailure = (error: Error) => ({
	type: "LOGIN_FAILURE",
	payload: error,
});
