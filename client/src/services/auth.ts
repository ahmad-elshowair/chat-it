import axios from "axios";
import { Dispatch } from "react";
import api from "../api/axiosInstance";
import {
  AuthAction,
  LoginCredentials,
  RegisterCredentials,
} from "../types/auth";
import {
  removeCsrfFromStorage,
  removeFingerprintFromStorage,
  setCsrfInStorage,
  setFingerprintInStorage,
} from "./session";

export const registerUser = async (
  userData: RegisterCredentials,
  dispatch: Dispatch<AuthAction>
) => {
  dispatch({ type: "START" });
  try {
    const response = await api.post(`/auth/register`, userData);

    // CHECK IF SECURITY TOKENS ARE PRESENT WHEN THE RESPONSE IS RECEIVED.
    if (!response.data.csrf) {
      console.error("CSRF TOKEN NOT FOUND IN LOGIN RESPONSE");
      dispatch({ type: "FAILURE", payload: ["CSRF TOKEN NOT FOUND"] });
      return;
    }

    if (!response.data.fingerprint) {
      console.error("FINGERPRINT NOT FOUND IN LOGIN RESPONSE");
      dispatch({ type: "FAILURE", payload: ["FINGERPRINT NOT FOUND"] });
      return;
    }

    // STORE THE FINGERPRINT IN SESSION STORAGE.
    setFingerprintInStorage(response.data.fingerprint);

    // STORE THE CSRF TOKEN IN SESSION STORAGE.
    setCsrfInStorage(response.data.csrf);

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

    // CHECK IF SECURITY TOKENS ARE PRESENT WHEN THE RESPONSE IS RECEIVED.
    if (!response.data.csrf) {
      console.error("CSRF TOKEN NOT FOUND IN LOGIN RESPONSE");
      dispatch({ type: "FAILURE", payload: ["CSRF TOKEN NOT FOUND"] });
      return;
    }

    if (!response.data.fingerprint) {
      console.error("FINGERPRINT NOT FOUND IN LOGIN RESPONSE");
      dispatch({ type: "FAILURE", payload: ["FINGERPRINT NOT FOUND"] });
      return;
    }

    // STORE THE FINGERPRINT IN SESSION STORAGE.
    setFingerprintInStorage(response.data.fingerprint);

    // STORE THE CSRF TOKEN IN SESSION STORAGE.
    setCsrfInStorage(response.data.csrf);

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

    // REMOVE FINGERPRINT FROM SESSION STORAGE FOR SECURITY.
    removeFingerprintFromStorage();

    // REMOVE CSRF TOKEN FROM SESSION STORAGE FOR SECURITY.
    removeCsrfFromStorage();
    dispatch({ type: "LOGOUT" });
    localStorage.removeItem("authState");
  } catch (error) {
    console.error("ERROR during logout", error);
    // STILL LOGOUT CLIENT-SIDE EVEN IF THE SERVER FAILS.
    removeFingerprintFromStorage();
    removeCsrfFromStorage();
    dispatch({ type: "LOGOUT" });
    localStorage.removeItem("authState");
  }
};
