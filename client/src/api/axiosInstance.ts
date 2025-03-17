import axios from "axios";
import config from "../configs";
import {
  getCsrfFromStorage,
  getFingerprintFromStorage,
  removeCsrfFromStorage,
  removeFingerprintFromStorage,
  setCsrfInStorage,
  setFingerprintInStorage,
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
      // ADD FINGERPRINT HEADER IF AVAILABLE.
      const fingerprint = getFingerprintFromStorage();
      if (fingerprint) {
        config.headers["X-Fingerprint"] = fingerprint;
      }

      // ADD CSRF TOKEN FOR NON-GET REQUEST IF AVAILABLE.
      const csrfToken = getCsrfFromStorage();
      if (
        csrfToken &&
        ["POST", "PUT", "DELETE", "PATCH"].includes(
          config.method?.toLowerCase() || ""
        )
      ) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // RESPONSE INTERCEPTOR - HANDLE TOKEN REFRESH AND FINGERPRINT UPDATES.
  api.interceptors.response.use(
    (response) => {
      // STORE NEW FINGERPRINT OF PROVIDE IN RESPONSE.
      if (response.data?.fingerprint) {
        setFingerprintInStorage(response.data.fingerprint);
      }

      // STORE CSRF TOKEN IF PROVIDED IN RESPONSE DATA.
      if (response.data?.csrf) {
        setCsrfInStorage(response.data.csrf);
      }

      // ALSO CHECK FOR CSRF THEN IN RESPONSE HEADER.
      const csrfToken = response.headers["x-csrf-token"];
      if (csrfToken) {
        setCsrfInStorage(csrfToken);
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // IF THE ERROR IS A 401 AND WE HAVEN'T RETRIED YET.
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          // ADD FINGERPRINT TO REFRESH TOKEN REQUEST.
          const fingerprint = getFingerprintFromStorage();
          const headers = fingerprint ? { "X-Fingerprint": fingerprint } : {};

          // TRY TO REFRESH THE TOKEN.
          const { data } = await api.post(
            "/auth/refresh-token",
            {},
            { withCredentials: true, headers }
          );
          // STORE NEW FINGERPRINT IF PROVIDED.
          if (data.fingerprint) {
            setFingerprintInStorage(data.fingerprint);
          }
          // STORE NEW CSRF IF PROVIDED.
          if (data.csrf) {
            setCsrfInStorage(data.csrf);
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

          return api(originalRequest);
        } catch (refreshError) {
          // IF THE REFRESH FAILS, CLEAR STORAGE AND REDIRECT TO LOGIN PAGE.
          removeFingerprintFromStorage();
          removeCsrfFromStorage();
          store.dispatch({ type: "LOGOUT" });
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
};

// HELPER METHOD TO GET THE STATE.
// const getState = (store: Store)=>{
//   return store.getState?.()|| {};
// }
export default api;
