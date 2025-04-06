import { useCallback, useContext } from "react";
import { checkAuthStatus } from "../api/axiosInstance";
import { AuthContext } from "../context/AuthContext";
import { loginUser, logoutUser, registerUser } from "../services/auth";
import { LoginCredentials, RegisterCredentials } from "../types/auth";

export const useAuth = () => {
  const { state, dispatch } = useContext(AuthContext);

  const verifyAuth = useCallback(async () => {
    try {
      const authenticated = await checkAuthStatus();
      dispatch({
        type: "CHECK_AUTH_STATUS",
        payload: authenticated,
      });
      return authenticated;
    } catch (error) {
      console.error("Auth verification failed: ", error);
      dispatch({
        type: "CHECK_AUTH_STATUS",
        payload: false,
      });
      return false;
    }
  }, [dispatch]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      return loginUser(credentials, dispatch);
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    return logoutUser(dispatch);
  }, [dispatch]);

  const register = useCallback(
    async (userData: RegisterCredentials) => {
      return registerUser(userData, dispatch);
    },
    [dispatch]
  );
  return {
    user: state.user,
    isAuthenticated: Boolean(state.user),
    isAuthChecked: state.authChecked,
    isLoading: state.loading,
    errors: state.errors,
    verifyAuth,
    login,
    logout,
    register,
  };
};
