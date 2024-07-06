import { Dispatch, ReactNode, createContext, useReducer } from "react";
import { AuthAction, AuthState } from "../types";
import AuthReducer from "./AuthReducer";

const initialState: AuthState = {
	user: null,
	isFetching: false,
	error: null,
};

export const AuthContext = createContext<{
	state: AuthState;
	dispatch: Dispatch<AuthAction>;
}>({
	state: initialState,
	dispatch: () => {},
});

function AuthProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(AuthReducer, initialState);
	return (
		<AuthContext.Provider
			value={{
				state,
				dispatch,
			}}>
			{children}
		</AuthContext.Provider>
	);
}

export default AuthProvider;
