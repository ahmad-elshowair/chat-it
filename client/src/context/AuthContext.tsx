import { Dispatch, ReactNode, createContext, useReducer } from "react";
import { TContextAction, TInitialState } from "../types";
import AuthReducer from "./AuthReducer"; // Ensure this path is correct

const initialState: TInitialState = {
	user: undefined,
	isFetching: false,
	isError: false,
};

export const AuthContext = createContext<{
	state: TInitialState;
	dispatch: Dispatch<TContextAction>;
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
