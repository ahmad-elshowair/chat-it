import {
  Dispatch,
  ReactNode,
  createContext,
  useEffect,
  useReducer,
} from "react";
import { setUpInterceptors } from "../api/axiosInstance";
import { AuthAction, AuthState } from "../types/auth";
import AuthReducer, { initialState } from "./AuthReducer";

export const AuthContext = createContext<{
  state: AuthState;
  dispatch: Dispatch<AuthAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(AuthReducer, initialState);

  useEffect(() => {
    const store = {
      dispatch,
    };
    setUpInterceptors(store);
  }, []);
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
