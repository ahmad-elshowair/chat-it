import { useContext, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import api from "../../api/axiosInstance";
import { AuthContext } from "../../context/AuthContext";

export const PersistLogin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { state, dispatch } = useContext(AuthContext);
  const { user } = state;

  useEffect(() => {
    let isMounted = true;

    const verifyRefreshToken = async () => {
      try {
        // attempt to refresh the token
        const response = await api.post("/auth/refresh-token");
        dispatch({
          type: "REFRESH_TOKEN",
          payload: {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            user: response.data.user,
          },
        });
      } catch (error) {
        console.error("Failed to refresh the access token", error);
      } finally {
        isMounted && setIsLoading(false);
      }
    };

    // if we don't have a user state, attempt to verify the refresh token
    if (!user) {
      verifyRefreshToken();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [dispatch, user]);

  return <>{isLoading ? <h1>Loading...</h1> : <Outlet />}</>;
};
