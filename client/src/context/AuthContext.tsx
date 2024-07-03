import { Dispatch, ReactNode, createContext, useReducer } from "react";
import { TUser } from "../types/user"; // Ensure this path is correct
import AuthReducer from "./AuthReducer"; // Ensure this path is correct

export type Action = {
	type: string;
	payload?: any;
};

export type State = {
	user?: TUser;
	isFetching: boolean;
	error: boolean;
};

const INITIAL_STATE: State = {
	user: undefined,
	isFetching: false,
	error: false,
};

export const AuthContext = createContext<{
	state: State;
	dispatch: Dispatch<Action>;
}>({
	state: INITIAL_STATE,
	dispatch: () => {},
});

type AuthProviderProps = {
	children: ReactNode;
};

function AuthProvider({ children }: AuthProviderProps) {
	const [state, dispatch] = useReducer(AuthReducer, INITIAL_STATE);
	return (
		<AuthContext.Provider value={{ state, dispatch }}>
			{children}
		</AuthContext.Provider>
	);
}

export default AuthProvider;
