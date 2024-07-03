import { Dispatch, ReactNode, createContext, useReducer } from "react";
import { TContextAction, TInitialState } from "../types";
import { TUser } from "../types/user"; // Ensure this path is correct
import AuthReducer from "./AuthReducer"; // Ensure this path is correct

export type State = {
	user?: TUser;
	isFetching: boolean;
	error: boolean;
};

const INITIAL_STATE: TInitialState = {
	user: undefined,
	isFetching: false,
	error: false,
};

export const AuthContext = createContext<{
	state: State;
	dispatch: Dispatch<TContextAction>;
}>({
	state: INITIAL_STATE,
	dispatch: () => {},
});

function AuthProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(AuthReducer, INITIAL_STATE);
	return (
		<AuthContext.Provider value={{ state, dispatch }}>
			{children}
		</AuthContext.Provider>
	);
}

export default AuthProvider;
