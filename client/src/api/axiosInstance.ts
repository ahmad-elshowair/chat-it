import axios from "axios";
import { useContext } from "react";
import config from "../configs";
import { AuthContext } from "../context/AuthContext";

const api = axios.create({
	baseURL: config.api_url,
	withCredentials: true,
});

api.interceptors.request.use(
	(config) => {
		const { user } = useContext(AuthContext).state;
		if (user?.access_token) {
			config.headers.Authorization = `Bearer ${user.access_token}`;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const { state, dispatch } = useContext(AuthContext);
		const originalRequest = error.config;
		if (error.response.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true;
			try {
				const { data } = await axios.post(
					`${config.api_url}/auth/refresh-token`,
					{ refresh_token: state.user?.refresh_token },
				);
				dispatch({
					type: "REFRESH_TOKEN",
					payload: { access_token: data.access_token },
				});

				originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
				return api(originalRequest);
			} catch (error) {
				return Promise.reject(error);
			}
		}
		return Promise.reject(error);
	},
);
export default api;
