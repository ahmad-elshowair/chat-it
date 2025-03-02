import axios from "axios";
import config from "../configs";
import { Store } from "../types/auth";

const api = axios.create({
  baseURL: config.api_url,
  withCredentials: true,
});

export const setUpInterceptors = (store: Store) => {
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // IF THE ERROR IS A 401 AND WE HAVEN'T RETRIED YET
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          // TRY TO REFRESH THE TOKEN
          const { data } = await api.post(
            "/auth/refresh-token",
            {},
            { withCredentials: true }
          );

          // UPDATE THE STATE WITH NEW TOKENS
          store.dispatch({
            type: "REFRESH_TOKEN",
            payload: {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              user: data.user,
            },
          });

          // RETRY ORIGINAL REQUEST WITH NEW TOKEN
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // IF THE REFRESH FAILS, REDIRECT TO LOGIN
          store.dispatch({ type: "LOGOUT" });
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
  return api;
};
export default api;
