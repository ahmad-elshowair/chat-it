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
    // ENSURE WE'RE USING withCredentials FOR THIS CRITICAL REQUEST.
    const response = await api.post(`/auth/login`, userCredentials, {
      withCredentials: true,
    });

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
    // ENSURE WE'RE USING withCredentials FOR THIS CRITICAL REQUEST.
    dispatch({ type: "START" });
    await api.post(
      "/auth/logout",
      {},
      {
        withCredentials: true,
      }
    );
    // REMOVE SECURITY TOKENS FROM SESSION STORAGE FOR SECURITY.
    removeFingerprintFromSessionStorage();
    removeCsrfFromSessionStorage();

    dispatch({ type: "LOGOUT" });
  } catch (error) {
    console.error("LOGOUT ERROR: ");
    if (axios.isAxiosError(error)) {
      console.error("Status: ", error.response?.status);
      console.error("Data: ", error.response?.data);
    } else if (error instanceof Error) {
      console.error("Error message: ", error.message);
    } else {
      console.error("Unknown error type", error);
    }
    // STILL LOGOUT CLIENT-SIDE EVEN IF THE SERVER FAILS.
    removeFingerprintFromSessionStorage();
    removeCsrfFromSessionStorage();
    dispatch({ type: "LOGOUT" });
  }
};
