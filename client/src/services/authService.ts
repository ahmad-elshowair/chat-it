import axios from "axios";
import { Dispatch } from "react";
import { TContextAction, TLogin, TRegister } from "../types";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const registerUser = async (userData: TRegister) => {
	const response = await axios.post(`${API_URL}/users/register`, userData);
	return response.data;
};

export const loginCall = async (
	userCredentials: TLogin,
	dispatch: Dispatch<TContextAction>,
) => {
	dispatch({ type: "LOGIN_START" });
	try {
		const response = await axios.post(`${API_URL}users/login`, userCredentials);

		dispatch({ type: "LOGIN_SUCCESS", payload: response.data });
	} catch (error) {
		dispatch({
			type: "LOGIN_FAILURE",
			payload: error,
		});
	}
};
