import axios from "axios";
import { Dispatch } from "react";
import api from "../api/axiosInstance";
import configs from "../configs";
import {
  AuthAction,
  LoginCredentials,
  RegisterCredentials,
} from "../types/auth";
import {
  clearAuthStorage,
  getCsrf,
  getFingerprint,
  setCsrf,
  setFingerprint,
  setTokenExpiration,
} from "./storage";

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
    setFingerprint(response.data.fingerprint);
    setCsrf(response.data.csrf);
    setTokenExpiration(configs.access_token_expiry);

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

    const { csrf, fingerprint, user } = response.data;
    // CHECK IF SECURITY TOKENS ARE PRESENT WHEN THE RESPONSE IS RECEIVED.
    if (!csrf) {
      console.error("CSRF TOKEN NOT FOUND IN LOGIN RESPONSE");
      dispatch({ type: "FAILURE", payload: ["CSRF TOKEN NOT FOUND"] });
      return;
    }

    if (!fingerprint) {
      console.error("FINGERPRINT NOT FOUND IN LOGIN RESPONSE");
      dispatch({ type: "FAILURE", payload: ["FINGERPRINT NOT FOUND"] });
      return;
    }

    // STORE TOKENS IN SESSION STORAGE.
    setFingerprint(fingerprint);
    setCsrf(csrf);
    setTokenExpiration(configs.access_token_expiry);

    // Verify fingerprint was successfully stored
    const storedFingerprint = getFingerprint();
    if (!storedFingerprint) {
      console.error("Failed to store fingerprint in localStorage");
      dispatch({ type: "FAILURE", payload: ["Authentication error occurred"] });
      return;
    }
    const payload = {
      user,
      csrf,
      fingerprint,
    };
    dispatch({ type: "SUCCEEDED", payload });
  } catch (error) {
    let errorMessage: string = (error as Error).message;
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
  dispatch({ type: "START" });
  try {
    const csrfToken = getCsrf();
    // ENSURE WE'RE USING withCredentials FOR THIS CRITICAL REQUEST.
    await api.post(
      "/auth/logout",
      {},
      {
        withCredentials: true,
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      }
    );
    // REMOVE SECURITY TOKENS FROM SESSION STORAGE FOR SECURITY.
    clearAuthStorage();

    dispatch({ type: "LOGOUT" });
    return true;
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
    clearAuthStorage();
    dispatch({ type: "LOGOUT" });
    return false;
  }
};
