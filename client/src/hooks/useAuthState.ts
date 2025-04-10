import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const useAuthState = () => {
  const { state } = useContext(AuthContext);

  return {
    user: state.user,
    isAuthenticated: !!state.user,
    isAuthChecked: state.authChecked,
    isLoading: state.loading,
    errors: state.errors,
    fingerprint: state.fingerprint,
    csrf: state.csrf,
  };
};

export default useAuthState;
