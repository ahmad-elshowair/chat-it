import { AuthAction, AuthState } from "../types";

const AuthReducer = (state: AuthState, action: AuthAction) => {
	switch (action.type) {
		case "START":
			return {
				...state,
				user: null,
				isFetching: true,
				error: null,
			};
		case "SUCCEEDED":
			return {
				...state,
				user: action.payload,
				isFetching: false,
				error: null,
			};
		case "FAILURE":
			return {
				...state,
				user: null,
				isFetching: false,
				error: action.payload,
			};
		default:
			return { ...state };
	}
};

export default AuthReducer;
