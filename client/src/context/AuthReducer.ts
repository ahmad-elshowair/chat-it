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
				errors: [],
			};
		case "FAILURE":
			return {
				...state,
				loading: false,
				errors: action.payload,
			};

		default:
			return { ...state };
	}
};

export default AuthReducer;
