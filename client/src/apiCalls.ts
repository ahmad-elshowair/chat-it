import axios from "axios";
import { Dispatch } from "react";
import { TContextAction, TLogin } from "./types";

export const loginCall = async (
	userCredentials: TLogin,
	dispatch: Dispatch<TContextAction>,
) => {
	dispatch({ type: "LOGIN_START" });
	try {
		const res = await axios.post("users/login", userCredentials);
		console.log(res);

		dispatch({ type: "LOGIN_SUCCESS", payload: res.data });
	} catch (error) {
		dispatch({
			type: "LOGIN_FAILURE",
			payload: error,
		});
	}
};
