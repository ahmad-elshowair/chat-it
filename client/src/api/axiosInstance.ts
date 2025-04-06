import axios from "axios";
import config from "../configs";
import {
  getCsrfFromSessionStorage,
  getFingerprintFromSessionStorage,
  removeCsrfFromSessionStorage,
  removeFingerprintFromSessionStorage,
  setCsrfInSessionStorage,
  setFingerprintInSessionStorage,
} from "../services/session";
import { Store } from "../types/auth";

const api = axios.create({
  baseURL: config.api_url,
  withCredentials: true,
});

export const setUpInterceptors = (store: Store) => {
  //REQUEST INTERCEPTOR - ADD FINGERPRINT HEADER IF AVAILABLE.
  api.interceptors.request.use(
    (config) => {
      console.info(
        `Making ${config.method?.toUpperCase()} request to: ${config.url}`
      );
      // ADD FINGERPRINT HEADER IF AVAILABLE.
      const fingerprint = getFingerprintFromSessionStorage();
      if (fingerprint) {
        config.headers["X-Fingerprint"] = fingerprint;
        console.info("Adding fingerprint to request:", config.url);
      } else {
        console.warn("No fingerprint available for request:", config.url);
      }

      // GET CSRF TOKEN FOR NON-GET REQUEST IF AVAILABLE.
      const csrfToken = getCsrfFromSessionStorage();
      if (
        csrfToken &&
        ["post", "put", "delete", "patch"].includes(
          config.method?.toLowerCase() || ""
        )
      ) {
        config.headers["X-CSRF-Token"] = csrfToken;
        console.info("Adding CSRF token to request:", config.url);
      } else if (
        ["post", "put", "delete", "patch"].includes(
          config.method?.toLowerCase() || ""
        )
      ) {
        console.warn(
          "No CSRF token available for non-GET request:",
          config.url
        );
      }

      // Always ensure withCredentials is set to true for all requests
      config.withCredentials = true;

      return config;
    },
    (error) => {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    }
  );

  // RESPONSE INTERCEPTOR - HANDLE TOKEN REFRESH AND FINGERPRINT UPDATES.
  api.interceptors.response.use(
    (response) => {
      // STORE NEW FINGERPRINT OF PROVIDE IN RESPONSE.
      if (response.data?.fingerprint) {
        setFingerprintInSessionStorage(response.data.fingerprint);
        console.info("Updated fingerprint from response");
      }

      // STORE CSRF TOKEN IF PROVIDED IN RESPONSE DATA.
      if (response.data?.csrf) {
        setCsrfInSessionStorage(response.data.csrf);
        console.info("Updated CSRF token from response data");
      }

      // ALSO CHECK FOR CSRF THEN IN RESPONSE HEADER.
      const csrfToken = response.headers["x-csrf-token"];
      if (csrfToken) {
        setCsrfInSessionStorage(csrfToken);
        console.info("Updated CSRF token from response header");
      }
      return response;
    },
    async (error) => {
      // Add detailed error logging
      if (error.response) {
        // Server responded with an error status code
        console.error("Response error:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
          url: error.config.url,
        });
      } else if (error.request) {
        // Request was made but no response received
        console.error("No response received:", {
          request: error.request,
          url: error.config?.url,
          method: error.config?.method,
        });
      } else {
        // Error in setting up the request
        console.error("Request setup error:", error.message);
      }
      const originalRequest = error.config;
      console.log("response error status:", error.response?.status);
      console.log("Is this a retry? ", originalRequest._retry);

      // IF THE ERROR IS A 401 AND WE HAVEN'T RETRIED YET.
      if (error.response?.status === 401 && !originalRequest._retry) {
        console.info("Attempting to refresh token for 401 error");
        originalRequest._retry = true;
        try {
          // ADD FINGERPRINT TO REFRESH TOKEN REQUEST.
          const fingerprint = getFingerprintFromSessionStorage();
          const headers = fingerprint ? { "X-Fingerprint": fingerprint } : {};

          // TRY TO REFRESH THE TOKEN.
          console.log("Refreshing token...");
          const { data } = await api.post(
            "/auth/refresh-token",
            {},
            { withCredentials: true, headers }
          );

          console.info("Token refreshed successfully");

          // STORE NEW FINGERPRINT IF PROVIDED.
          if (data.fingerprint) {
            setFingerprintInSessionStorage(data.fingerprint);
            console.info("stored new fingerprint from refresh token");
          }
          // STORE NEW CSRF IF PROVIDED.
          if (data.csrf) {
            setCsrfInSessionStorage(data.csrf);
            console.info("stored new csrf from refresh token");
          }
          // UPDATE THE STATE WITH NEW DATA.
          store.dispatch({
            type: "REFRESH_TOKEN",
            payload: {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              user: data.user,
              fingerprint: data.fingerprint,
              csrf: data.csrf,
            },
          });

          // RETRY THE ORIGINAL REQUEST WITH NEW FINGERPRINT IF NEEDED.
          if (data.fingerprint) {
            originalRequest.headers["X-Fingerprint"] = data.fingerprint;
          }
          // ADD CSRF TOKEN IF IT EXISTS.
          if (data.csrf) {
            originalRequest.headers["X-CSRF-Token"] = data.csrf;
          }
          // ADD ACCESS TOKEN.
          originalRequest.headers[
            "Authorization"
          ] = `Bearer ${data.access_token}`;

          console.info("Retrying original request with new tokens");
          return api(originalRequest);
        } catch (refreshError) {
          // IF THE REFRESH FAILS, CLEAR STORAGE AND REDIRECT TO LOGIN PAGE.
          console.error("Failed to refresh token", refreshError);
          removeFingerprintFromSessionStorage();
          removeCsrfFromSessionStorage();
          store.dispatch({ type: "LOGOUT" });
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      } else if (error.response?.status === 403) {
        console.warn("Unauthorized access - token may have expired");
        removeFingerprintFromSessionStorage();
        removeCsrfFromSessionStorage();
        store.dispatch({ type: "LOGOUT" });
        window.location.href = "/login";
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }
  );
};

// HELPER FUNCTION TO CHECK IF USER IS AUTHENTICATED.
export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    const response = await api.get("/auth/is-authenticated");
    return response.data.authenticated;
  } catch (error) {
    console.error("Auth Check failed, user is not authenticated", error);
    return false;
  }
};

export default api;
