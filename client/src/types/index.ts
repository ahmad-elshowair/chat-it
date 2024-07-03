import { TUser } from "./user";

export type TLogin = {
	email: string;
	password: string;
};

export type TContextAction = {
	type: string;
	payload?: any;
};

export type TInitialState = {
	user?: TUser;
	isFetching: boolean;
	error: boolean;
};
