export type UserPayload = {
	user_id?: string;
	user_name: string;
	email: string;
	picture?: string;
	cover?: string;
	is_admin?: boolean;
	bio?: string;
	city?: string;
	home_town?: string;
	updated_at?: Date;
	first_name: string;
	last_name: string;
	marital_status?: string;
	token: string;
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
	| { type: "SUCCEEDED"; payload: UserPayload }
	| { type: "FAILURE"; payload: string[] };

export type AuthState = {
	user: UserPayload | null;
	loading: boolean;
	errors: string[] | null;
};
