import axios from "axios";
import { Dispatch } from "react";
import config from "../configs";
import { AuthAction, AuthState } from "../types";

const api = axios.create({
	baseURL: config.api_url,
	withCredentials: true,
});

export const setUpInterceptors = (
	authState: AuthState,
	dispatch: Dispatch<AuthAction>,
) => {
	api.interceptors.request.use(
		(config) => {
			if (authState.user?.access_token) {
				config.headers.Authorization = `Bearer ${authState.user.access_token}`;
			}
			return config;
		},
		(error) => Promise.reject(error),
	);

	api.interceptors.response.use(
		(response) => response,
		async (error) => {
			const originalRequest = error.config;
			if (error.response.status === 401 && !originalRequest._retry) {
				originalRequest._retry = true;
				try {
					const { data } = await axios.post(
						`${config.api_url}/auth/refresh-token`,
						{ refresh_token: authState.user?.refresh_token },
					);
					dispatch({
						type: "REFRESH_TOKEN",
						payload: { access_token: data.access_token },
					});

					originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
					return api(originalRequest);
				} catch (error) {
					dispatch({ type: "FAILURE", payload: [(error as Error).message] });
					return Promise.reject(error);
				}
			}
			return Promise.reject(error);
		},
	);
};
export default api;
