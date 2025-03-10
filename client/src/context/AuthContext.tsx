import { Dispatch, ReactNode, createContext, useReducer } from "react";
import { AuthAction, AuthState } from "../types/auth";
import AuthReducer, { loadState } from "./AuthReducer";

// Initial state
const initialState: AuthState = loadState();

export const AuthContext = createContext<{
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(AuthReducer, initialState);
  return (
    <AuthContext.Provider
      value={{
        state,
        dispatch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
