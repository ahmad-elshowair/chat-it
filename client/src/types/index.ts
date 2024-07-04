export type TLoginPayload = {
	username: string;
	email: string;
	isAdmin: boolean;
	token: string;
};
export type TLogin = {
	email?: string;
	password?: string;
};
export type TRegister = {
	username: string;
	email: string;
	password: string;
	first_name: string;
	last_name: string;
};
export type TContextAction = {
	type: string;
	payload?: any;
};

export type TInitialState = {
	user?: TLoginPayload;
	isFetching: boolean;
	isError: boolean;
};
