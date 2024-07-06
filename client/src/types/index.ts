export type UserPayload = {
	user_id: string;
	username: string;
	email: string;
	isAdmin: boolean;
	token: string;
};
export type LoginCredentials = {
	email?: string;
	password?: string;
};
export type RegisterCredentials = {
	username: string;
	email: string;
	password: string;
	first_name: string;
	last_name: string;
};
export type AuthAction =
	| { type: "START" }
	| { type: "SUCCEEDED"; payload: UserPayload }
	| { type: "FAILURE"; payload: string };

export type AuthState = {
	user: UserPayload | null;
	isFetching: boolean;
	error: string | null;
};
