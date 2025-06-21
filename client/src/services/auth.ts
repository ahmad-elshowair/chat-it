import axios from "axios";
import { Dispatch } from "react";
import { ApiError } from "../api/ApiError";
import configs from "../configs";
import { createSecureApi } from "../hooks/useSecureApi";
import {
  AuthAction,
  LoginCredentials,
  RegisterCredentials,
} from "../types/auth";
import { TUserPayload } from "../types/user";
import {
  clearAuthStorage,
  getFingerprint,
  setCsrf,
  setFingerprint,
  setTokenExpiration,
} from "./storage";

const { post } = createSecureApi();

export const registerUser = async (
  userData: RegisterCredentials,
  dispatch: Dispatch<AuthAction>
) => {
  dispatch({ type: "START" });
  try {
    const response = await post<{
      success: boolean;
      data: {
        csrf: string;
        fingerprint: string;
        user: TUserPayload;
      };
    }>(`/auth/register`, userData);

    if (!response || !response.success) {
      console.error(" Registration Failed - response error");
      dispatch({
        type: "FAILURE",
        payload: ["Registration failed - Please try again later."],
      });
      return;
    }

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
      success: true,
    };

    dispatch({ type: "SUCCEEDED", payload });
  } catch (error) {
    console.error("Registration failed:", error);

    let errorMessage: string[] = ["AN UNEXPECTED ERROR WITH REGISTRATION !"];

    if (error instanceof ApiError) {
      if (error.status === 400 && error.data?.errors) {
        errorMessage = error.data.errors.map((err: { msg: string }) => err.msg);
      } else {
        errorMessage = [error.message || "Registration Failed"];
      }
    } else if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400 && error.response.data.errors) {
        errorMessage = error.response.data.errors.map(
          (err: { msg: string }) => err.msg
        );
      } else {
        errorMessage = [error.response.data || "Registration Failed"];
      }
    }
    dispatch({ type: "FAILURE", payload: errorMessage });
  }
};

export const loginUser = async (
  userCredentials: LoginCredentials,
  dispatch: Dispatch<AuthAction>
) => {
  dispatch({ type: "START" });
  try {
    // ENSURE WE'RE USING withCredentials FOR THIS CRITICAL REQUEST.
    const response = await post<{
      success: boolean;
      data: { user: TUserPayload; csrf: string; fingerprint: string };
    }>(`/auth/login`, userCredentials);
    if (!response) {
      console.error("LOGIN Failed - No Response received");
      dispatch({
        type: "FAILURE",
        payload: ["No Response from server - Please try again later"],
      });
      return;
    }

    if (!response.success) {
      console.error("LOGIN Failed - Server returned Error");
      dispatch({
        type: "FAILURE",
        payload: ["Login Failed - Please try again later"],
      });
      return;
    }
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
      success: true,
    };
    dispatch({ type: "SUCCEEDED", payload });
  } catch (error) {
    console.error("LOGIN failed:", error);

    let errorMessage: string[] = ["AN UNEXPECTED ERROR WITH REGISTRATION !"];

    if (error instanceof ApiError) {
      if (error.status === 400 && error.data?.errors) {
        errorMessage = error.data.errors.map((err: { msg: string }) => err.msg);
      } else {
        errorMessage = [error.message || "LOGIN Failed"];
      }
    } else if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 400 && error.response.data.errors) {
        errorMessage = error.response.data.errors.map(
          (err: { msg: string }) => err.msg
        );
      } else {
        errorMessage = [error.response.data || "LOGIN Failed"];
      }
    }
    dispatch({ type: "FAILURE", payload: errorMessage });
  }
};

export const logoutUser = async (dispatch: Dispatch<AuthAction>) => {
  dispatch({ type: "START" });
  try {
    await post("/auth/logout", {});

    clearAuthStorage();

    dispatch({ type: "LOGOUT" });
    return true;
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    // LOG DETAILED ERROR INFORMATION FOR DEBUGGING
    if (error instanceof ApiError) {
      console.error("Status: ", error.status);
      console.error("Message: ", error.message);
      console.error("Data: ", error.data);
    } else if (axios.isAxiosError(error)) {
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
