import { AuthAction, AuthState } from "../types";

const AuthReducer = (state: AuthState, action: AuthAction) => {
	switch (action.type) {
		case "START":
			return {
				...state,
				user: null,
				isFetching: true,
				error: null,
				validationErrors: null,
			};
		case "SUCCEEDED":
			return {
				...state,
				user: action.payload,
				isFetching: false,
				error: null,
				validationErrors: null,
			};
		case "FAILURE":
			return {
				...state,
				user: null,
				isFetching: false,
				error: action.payload as string,
				validationErrors: null,
			};
		case "VALIDATION_ERRORS":
			return {
				...state,
				user: null,
				isFetching: false,
				error: null,
				validationErrors: action.payload as Record<string, string>,
			};
		default:
			return { ...state };
	}
};

export default AuthReducer;
