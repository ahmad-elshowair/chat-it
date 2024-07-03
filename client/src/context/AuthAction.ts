export const LoginStart = ({ userCredentials }: { userCredentials: any }) => ({
	type: "LOGIN_START",
});

export const LoginSuccess = ({ user }: { user: any }) => ({
	type: "LOGIN_SUCCESS",
	payload: user,
});

export const LoginFailure = ({ error }: { error: string }) => ({
	type: "LOGIN_FAILURE",
	payload: error,
});
