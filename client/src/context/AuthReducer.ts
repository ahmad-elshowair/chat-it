import { TContextAction, TInitialState } from "../types";

const AuthReducer = (state: TInitialState, action: TContextAction) => {
	switch (action.type) {
		case "LOGIN_START":
			return {
				user: null,
				isFetching: true,
				error: false,
			};
		case "LOGIN_SUCCESS":
			return {
				user: action.payload,
				isFetching: false,
				error: false,
			};
		case "LOGIN_FAILURE":
			return {
				user: null,
				isFetching: false,
				error: true,
			};
		default:
			return { ...state };
	}
};

export default AuthReducer;
