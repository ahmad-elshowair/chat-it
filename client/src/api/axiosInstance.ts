import axios from "axios";

import configs from "../configs";
import { getCsrf, getFingerprint } from "../services/storage";
import { Store } from "../types/TAuth";
import { setupCsrfInterceptor } from "./csrfInterceptor";
import { setupRequestInterceptor } from "./requestInterceptor";

const api = axios.create({
  baseURL: configs.api_url,
  withCredentials: true,
});

setupRequestInterceptor(api);
setupCsrfInterceptor(api);

export const setUpInterceptors = (store: Store) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const status = error?.response?.status;
      const refreshTokenUrl = "/auth/refresh-token";

      // IF THE ERROR IS A 401 AND WE HAVEN'T RETRIED YET
      if (
        status === 401 &&
        !originalRequest._retry &&
        originalRequest.url !== refreshTokenUrl
      ) {
        originalRequest._retry = true;
        try {
          console.log(
            `Axios Interceptor: Attempting token refresh due to 401 on ${originalRequest.url}`
          );

          const fingerprint = getFingerprint();
          if (!fingerprint) {
            console.warn(
              "Axios Interceptor: No fingerprint found for refresh request. Logging out."
            );
            throw new Error("Missing fingerprint for token refresh.");
          }

          const headers: Record<string, string> = {
            "X-Fingerprint": fingerprint,
          };

          const csrfToken = getCsrf();
          if (csrfToken) {
            headers["X-CSRF-Token"] = csrfToken;
          }
          // TRY TO REFRESH THE TOKEN
          const { data } = await api.post(
            refreshTokenUrl,
            {},
            { withCredentials: true, headers }
          );

          console.log("Axios Interceptor: Token refresh successful.");

          // UPDATE THE STATE WITH NEW TOKENS
          store.dispatch({
            type: "REFRESH_TOKEN",
            payload: {
              user: data.user,
              fingerprint: data.fingerprint,
              csrf: data.csrf,
            },
          });

          // RE-TRY THE ORIGINAL REQUEST.
          console.log(
            `Axios Interceptor: Retrying original request to ${originalRequest.url}`
          );
          return api(originalRequest);
        } catch (refreshError) {
          let errorMessage = "An unknown error occurred during token refresh.";
          if (axios.isAxiosError(refreshError)) {
            errorMessage =
              refreshError.response?.data?.message || refreshError.message;
            console.error(
              "Axios Interceptor: Refresh token attempt failed (Axios Error). Status:",
              refreshError.response?.status,
              "Data:",
              refreshError.response?.data
            );
          } else if (refreshError instanceof Error) {
            errorMessage = refreshError.message;
            console.error(
              "Axios Interceptor: Refresh token attempt failed (Standard Error).",
              errorMessage
            );
          } else {
            console.error(
              "Axios Interceptor: Refresh token attempt failed (Unknown Error).",
              refreshError
            );
          }
          // IF THE REFRESH FAILS, REDIRECT TO LOGIN
          store.dispatch({ type: "LOGOUT" });
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }

      // IFF THE ERROR IS 401 SPECIFICALLY FROM THE REFRESH TOKE URL ITSELF, LOGOUT IMMEDIATELY.
      if (status === 401 && originalRequest.url === refreshTokenUrl) {
        console.error(
          "Axios Interceptor: Refresh token request itself failed with 401. Logging out."
        );
        store.dispatch({ type: "LOGOUT" });
        console.log(
          "Axios Interceptor: Redirecting to /login due to refresh token 401."
        );
        window.location.href = "/login";
        // REJECT THE PROMISE FOR THE FAILED REFRESH TOKEN REQUEST.
        return Promise.reject(error);
      }
      // For errors other than 401, or 401s that have already been retried or are from refresh URL (handled above), reject the promise.
      console.debug(
        `Axios Interceptor: Rejecting promise for ${originalRequest.url} (Status: ${status}, Retried: ${originalRequest._retry})`
      );
      return Promise.reject(error);
    }
  );

  return api;
};
export default api;
