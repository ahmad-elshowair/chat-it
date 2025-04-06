import { useContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import api from "../../api/axiosInstance";
import { AuthContext } from "../../context/AuthContext";

export const PersistLogin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { state, dispatch } = useContext(AuthContext);
  const { authChecked } = state;

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      try {
        // Check auth status with the server
        const response = await api.get("/auth/is-authenticated");

        // HANDLE THE ENHANCED RESPONSE FROM SERVER.
        if (response.data.authenticated) {
          // IF SERVER RETURNS USER DATA, UPDATE AUTH STATUS WITH COMPLETE USER INFO.
          if (response.data.user) {
            dispatch({
              type: "SUCCEEDED",
              payload: {
                user: response.data.user,
                fingerprint: response.data.fingerprint,
                csrf: response.data.csrf,
              },
            });
          } else {
            // FALLBACK FOR BACKWARD COMPATIBILITY.
            dispatch({
              type: "CHECK_AUTH_STATUS",
              payload: true,
            });
          }
        } else {
          // Update auth status based on server response
          dispatch({
            type: "CHECK_AUTH_STATUS",
            payload: false,
          });
        }
      } catch (error) {
        console.error("Failed to verify authentication status", error);
        // If check fails, set auth status to false
        dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
      } finally {
        isMounted && setIsLoading(false);
      }
    };

    // If auth hasn't been checked yet, verify with the server
    if (!authChecked) {
      verifyAuth();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [dispatch, authChecked]);

  return <>{isLoading ? <h1>Loading...</h1> : <Outlet />}</>;
};
