import { useCallback, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { loginUser, logoutUser, registerUser } from "../services/auth";
import { LoginCredentials, RegisterCredentials } from "../types/auth";

const useAuthActions = () => {
  const { dispatch } = useContext(AuthContext);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      return loginUser(credentials, dispatch);
    },
    [dispatch]
  );

  const register = useCallback(
    async (userData: RegisterCredentials) => {
      return registerUser(userData, dispatch);
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    return logoutUser(dispatch);
  }, [dispatch]);

  return {
    login,
    logout,
    register,
  };
};

export default useAuthActions;
