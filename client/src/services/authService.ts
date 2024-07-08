import axios from "axios";
import { Dispatch } from "react";
import { AuthAction, LoginCredentials, RegisterCredentials } from "../types";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const registerUser = async (
	userData: RegisterCredentials,
	dispatch: Dispatch<AuthAction>,
) => {
	dispatch({ type: "START" });
	try {
		const response = await axios.post(`${API_URL}/users/register`, userData);
		dispatch({ type: "SUCCEEDED", payload: response.data });
		// return response.data;
	} catch (error) {
		let errorMessage: string = "AN UNEXPECTED ERROR WITH REGISTRATION !";
		if (axios.isAxiosError(error) && error.response) {
			if (error.response.status === 400 && error.response.data.errors) {
				const validationErrors = error.response.data.errors.map(
					(err: { msg: string }) => err.msg,
				);

				console.log(validationErrors);

				dispatch({ type: "FAILURE", payload: validationErrors });
			} else {
				errorMessage = error.response.data;
				dispatch({ type: "FAILURE", payload: [errorMessage] });
			}
		} else {
			dispatch({ type: "FAILURE", payload: [errorMessage] });
		}
	}
};

export const loginUser = async (
	userCredentials: LoginCredentials,
	dispatch: Dispatch<AuthAction>,
) => {
	dispatch({ type: "START" });
	try {
		const response = await axios.post(
			`${API_URL}/users/login`,
			userCredentials,
		);

		dispatch({ type: "SUCCEEDED", payload: response.data });
	} catch (error) {
		let errorMessage: string = "AN UNEXPECTED ERROR WITH LOGIN !";
		if (axios.isAxiosError(error) && error.response) {
			if (error.response.status === 400 && error.response.data.errors) {
				const validationErrors = error.response.data.errors.map(
					(err: { msg: string }) => err.msg,
				);

				console.log(validationErrors);

				dispatch({ type: "FAILURE", payload: validationErrors });
			} else {
				errorMessage = error.response.data;
				dispatch({ type: "FAILURE", payload: [errorMessage] });
			}
		} else {
			dispatch({ type: "FAILURE", payload: [errorMessage] });
		}
	}
};
