import { AuthAction, AuthState } from "../types";

const AuthReducer = (state: AuthState, action: AuthAction) => {
	switch (action.type) {
		case "START":
			return {
				...state,
				loading: true,
				errors: null,
			};
		case "SUCCEEDED":
			return {
				...state,
				loading: false,
				user: action.payload,
				errors: null,
			};
		case "FAILURE":
			return {
				...state,
				loading: false,
				errors: action.payload,
			};
		case "REFRESH_TOKEN":
			if (state.user) {
				return {
					...state,
					user: {
						...state.user,
						access_token: action.payload.access_token,
					},
				};
			}
			return state;

		default:
			return { ...state };
	}
};

export default AuthReducer;
