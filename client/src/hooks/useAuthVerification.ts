import axios from "axios";
import { useCallback, useContext } from "react";
import api from "../api/axiosInstance";
import config from "../configs";
import { AuthContext } from "../context/AuthContext";
import {
  getCsrf,
  getFingerprint,
  isTokenExpired,
  setCsrf,
  setFingerprint,
} from "../services/storage";

const useAuthVerification = () => {
  const { dispatch } = useContext(AuthContext);

  const refreshTokens = useCallback(async () => {
    try {
      // GET fingerprint FROM SESSION STORAGE FOR TOKEN VALIDATION
      const fingerprint = getFingerprint();

      // IF NO fingerprint IS AVAILABLE, WE CAN'T REFRESH TOKENS.
      if (!fingerprint) {
        console.warn("No Fingerprint available for token refresh");
        return false;
      }

      // SET UP HEADER WITH fingerprint  CSRF TOKEN IF AVAILABLE.
      const headers: Record<string, string> = {
        "X-Fingerprint": fingerprint,
      };

      const csrfToken = getCsrf();
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }

      // MAKE A REFRESH TOKEN REQUEST WITH PROPER CREDENTIALS, AND HEADERS.
      console.log("Attempting to refresh auth tokens...");
      const refreshResult = await api.post(
        "/auth/refresh-token",
        {},
        { withCredentials: true, headers, timeout: 10000 }
      );

      // IF WE GOT A VALID RESPONSE WITH USER DATA,
      if (refreshResult?.data?.user) {
        console.log("Token refresh successfully!");
        // STORE SECURITY TOKENS IN SESSION STORAGE.
        if (refreshResult.data.fingerprint) {
          setFingerprint(refreshResult.data.fingerprint);
        }

        if (refreshResult.data.csrf) {
          setCsrf(refreshResult.data.csrf);
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
      // DETAILED ERROR LOGGING.
      if (axios.isAxiosError(error)) {
        console.error("Status code:", error.response?.status);
        console.error("Response data:", error.response?.data);
      } else {
        console.error("Error message:", (error as Error).message);
      }
      return false;
    }
  }, [dispatch]);

  const checkAuthStatus = useCallback(async () => {
    try {
      console.log("Checking authentication status...");
      const response = await api.get("/auth/is-authenticated", {
        timeout: 10000,
      });

      const { user, fingerprint, csrf, authenticated } = response.data;
      if (authenticated) {
        console.log("User is authenticated");
        // IF USER DATA IS INCLUDED IN THE RESPONSE.
        if (user) {
          // STORE SECURITY TOKEN IF PROVIDED.
          if (fingerprint) {
            setFingerprint(fingerprint);
          }

          if (csrf) {
            setCsrf(csrf);
          }

          // UPDATE AUTH STATE WITH NEW USER INFO.
          dispatch({
            type: "SUCCEEDED",
            payload: {
              user,
              fingerprint,
              csrf,
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
      // DETAILED ERROR LOGGING.
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          console.error("Authentication request timed out");
        } else if (error.response) {
          console.error("Status code:", error.response?.status);
          console.error("Response data:", error.response?.data);
        } else if (error.request) {
          console.error("No response received from server");
        }
      }
      dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
      return false;
    }
  }, [dispatch]);

  const verifyAuth = useCallback(async () => {
    // DISPATCH START ACTION TO INDICATE LOADING.
    dispatch({ type: "START" });
    // CREATE AN OVERALL TIMEOUT PROTECTION.
    const authTimeout = setTimeout(() => {
      console.error("Auth verification timeout after 10 seconds");
      dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
    }, 10000);
    try {
      // CHECK IF fingerprint EXISTS.
      let fingerprint = getFingerprint();
      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 300;

      while (!fingerprint && retryCount < maxRetries) {
        console.warn(
          `Retry ${retryCount + 1}/${maxRetries} to get fingerprint...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        fingerprint = getFingerprint();
        retryCount++;
      }

      if (!fingerprint) {
        console.error("Failed to retrieve fingerprint after retries");
        dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
        return;
      }

      if (isTokenExpired()) {
        // TOKEN EXPIRED, TRY REFRESH.
        const refreshResult = await refreshTokens();
        if (!refreshResult) {
          dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
        }
        return;
      }

      // TOKEN NOT EXPIRED, CHECK COOKIES BEFORE TRYING REFRESH.
      const accessTokenName =
        config.node_env === "development"
          ? "access_token"
          : "__Host-access_token";

      const accessToken = document.cookie.includes(accessTokenName);

      if (accessToken) {
        // TRY CHECK AUTH STATUS DIRECTLY FIRST.
        const authStatus = await checkAuthStatus().catch(() => false);

        // ONLY ATTEMPT REFRESH IF DIRECT CHECK FAILS.
        if (!authStatus) {
          const refreshResult = await refreshTokens();
          if (!refreshResult) {
            dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
          }
        }
      } else {
        // NO ACCESS TOKE, TRY REFRESH DIRECTLY.
        const refreshResult = await refreshTokens();
        if (!refreshResult) {
          dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
        }
      }
    } catch (error) {
      console.error("Authentication verification failed: ", error);
      dispatch({ type: "CHECK_AUTH_STATUS", payload: false });
    } finally {
      clearTimeout(authTimeout);
    }
  }, [refreshTokens, checkAuthStatus, dispatch]);

  return {
    refreshTokens,
    verifyAuth,
    checkAuthStatus,
  };
};

export default useAuthVerification;
