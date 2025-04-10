import axios from "axios";
import { useCallback, useContext } from "react";
import api from "../api/axiosInstance";
import { AuthContext } from "../context/AuthContext";
import {
  getCsrfFromSessionStorage,
  getFingerprintFromSessionStorage,
  setCsrfInSessionStorage,
  setFingerprintInSessionStorage,
} from "../services/session";

const useAuthVerification = () => {
  const { dispatch } = useContext(AuthContext);

  const refreshTokens = useCallback(async () => {
    try {
      // GET fingerprint FROM SESSION STORAGE FOR TOKEN VALIDATION
      const fingerprint = getFingerprintFromSessionStorage();

      // IF NO fingerprint IS AVAILABLE, WE CAN'T REFRESH TOKENS.
      if (!fingerprint) {
        console.warn("No Fingerprint available for token refresh");
        return false;
      }

      // SET UP HEADER WITH fingerprint  CSRF TOKEN IF AVAILABLE.
      const headers: Record<string, string> = {
        "X-Fingerprint": fingerprint,
      };

      const csrfToken = getCsrfFromSessionStorage();
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }

      // MAKE A REFRESH TOKEN REQUEST WITH PROPER CREDENTIALS, AND HEADERS.
      console.log("Attempting to refresh auth tokens...");
      const refreshResult = await api.post(
        "/auth/refresh-token",
        {},
        { withCredentials: true, headers }
      );

      // IF WE GOT A VALID RESPONSE WITH USER DATA,
      if (refreshResult?.data?.user) {
        console.log("Token refresh successfully!");
        // STORE SECURITY TOKENS IN SESSION STORAGE.
        if (refreshResult.data.fingerprint) {
          setFingerprintInSessionStorage(refreshResult.data.fingerprint);
        }

        if (refreshResult.data.csrf) {
          setCsrfInSessionStorage(refreshResult.data.csrf);
        }

        // UPDATE AUTH STATE WITH NEW USER INFO.
        dispatch({
          type: "SUCCEEDED",
          payload: {
            user: refreshResult.data.user,
            fingerprint: refreshResult.data.fingerprint,
            csrf: refreshResult.data.csrf,
          },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token Refresh failed: ", error);
      return false;
    }
  }, [dispatch]);

  const checkAuthStatus = useCallback(async () => {
    try {
      console.log("Checking authentication status...");
      const response = await api.get("/auth/is-authenticated");

      if (response?.data?.authenticated) {
        console.log("User is authenticated");

        // IF USER DATA IS INCLUDED IN THE RESPONSE.
        if (response.data.user) {
          // STORE SECURITY TOKEN IF PROVIDED.
          if (response.data.fingerprint) {
            setFingerprintInSessionStorage(response.data.fingerprint);
          }

          if (response.data.csrf) {
            setCsrfInSessionStorage(response.data.csrf);
          }

          // UPDATE AUTH STATE WITH NEW USER INFO.
          dispatch({
            type: "SUCCEEDED",
            payload: {
              user: response.data.user,
              fingerprint: response.data.fingerprint,
              csrf: response.data.csrf,
            },
          });
        } else {
          // SIMPLE AUTHENTICATED FLAG WITHOUT USER DATA (BACKWARD COMPATIBILITY.)
          dispatch({
            type: "CHECK_AUTH_STATUS",
            payload: true,
          });
        }
        return true;
      } else {
        console.log("User is NOT authenticated!");
        dispatch({
          type: "CHECK_AUTH_STATUS",
          payload: false,
        });
        return false;
      }
    } catch (error) {
      console.error("Auth check failed: ", error);

      // DETAILED ERROR LOGGING.I
      if (axios.isAxiosError(error) && error.response) {
        console.error("Status code:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
      return false;
    }
  }, [dispatch]);

  const verifyAuth = useCallback(async () => {
    // DISPATCH START ACTION TO INDICATE LOADING.
    dispatch({ type: "START" });
    try {
      // FIRST TRY TO REFRESH TOKENS.
      const refreshed = await refreshTokens().catch(() => false);
      // IF REFRESH FAILS, CHECK AUTH STATUS DIRECTLY.
      if (!refreshed) {
        console.warn("Token refresh failed, checking auth status directly");
        await checkAuthStatus();
      }
    } catch (error) {
      console.error("Authentication verification failed: ", error);
      dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
    }
  }, [refreshTokens, checkAuthStatus, dispatch]);

  return {
    refreshTokens,
    verifyAuth,
    checkAuthStatus,
  };
};

export default useAuthVerification;
