import axios from "axios";
import { Dispatch } from "react";
import api from "../api/axiosInstance";
import {
  AuthAction,
  LoginCredentials,
  RegisterCredentials,
} from "../types/auth";
import {
  removeCsrfFromSessionStorage,
  removeFingerprintFromSessionStorage,
  setCsrfInSessionStorage,
  setFingerprintInSessionStorage,
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

    // STORE TOKENS IN SESSION STORAGE.
    setFingerprintInSessionStorage(response.data.fingerprint);
    setCsrfInSessionStorage(response.data.csrf);

    dispatch({ type: "SUCCEEDED", payload: { ...response.data } });
  } catch (error) {
    let errorMessage: string = "AN UNEXPECTED ERROR WITH REGISTRATION !";
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400 && error.response.data.errors) {
        const validationErrors = error.response.data.errors.map(
          (err: { msg: string }) => err.msg
        );

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

    // STORE TOKENS IN SESSION STORAGE.
    setFingerprintInSessionStorage(response.data.fingerprint);
    setCsrfInSessionStorage(response.data.csrf);

    dispatch({ type: "SUCCEEDED", payload: response.data });
  } catch (error) {
    let errorMessage: string = "AN UNEXPECTED ERROR WITH LOGIN !";
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400 && error.response.data.errors) {
        const validationErrors = error.response.data.errors.map(
          (err: { msg: string }) => err.msg
        );
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

    // REMOVE SECURITY TOKENS FROM SESSION STORAGE FOR SECURITY.
    removeFingerprintFromSessionStorage();
    removeCsrfFromSessionStorage();

    dispatch({ type: "LOGOUT" });
  } catch (error) {
    console.error("ERROR during logout", error);
    // STILL LOGOUT CLIENT-SIDE EVEN IF THE SERVER FAILS.
    removeFingerprintFromSessionStorage();
    removeCsrfFromSessionStorage();
    dispatch({ type: "LOGOUT" });
  }
};
