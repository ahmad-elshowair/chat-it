import axios from "axios";
import { Dispatch } from "react";
import api from "../api/axiosInstance";
import {
  AuthAction,
  LoginCredentials,
  RegisterCredentials,
} from "../types/auth";

export const registerUser = async (
  userData: RegisterCredentials,
  dispatch: Dispatch<AuthAction>
) => {
  dispatch({ type: "START" });
  try {
    const response = await api.post(`/auth/register`, userData);
    dispatch({ type: "SUCCEEDED", payload: response.data });
    // return response.data;
  } catch (error) {
    let errorMessage: string = "AN UNEXPECTED ERROR WITH REGISTRATION !";
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400 && error.response.data.errors) {
        const validationErrors = error.response.data.errors.map(
          (err: { msg: string }) => err.msg
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
  dispatch: Dispatch<AuthAction>
) => {
  dispatch({ type: "START" });
  try {
    const response = await api.post(`/auth/login`, userCredentials);

    dispatch({ type: "SUCCEEDED", payload: response.data });
  } catch (error) {
    let errorMessage: string = "AN UNEXPECTED ERROR WITH LOGIN !";
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400 && error.response.data.errors) {
        const validationErrors = error.response.data.errors.map(
          (err: { msg: string }) => err.msg
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

export const logoutUser = async (dispatch: Dispatch<AuthAction>) => {
  try {
    await api.post("/auth/logout");
    dispatch({ type: "LOGOUT" });
    localStorage.removeItem("authState");
  } catch (error) {
    console.error("logout failed", error);

    // Still Clear Local Storage even if the server fails
    dispatch({ type: "LOGOUT" });
    localStorage.removeItem("authState");
  }
};
