import { AuthAction, AuthState } from "../types/auth";

export const loadState = (): AuthState => {
  try {
    const serializedState = localStorage.getItem("authState");
    if (serializedState === null) {
      return {
        user: null,
        loading: false,
        errors: null,
        fingerprint: undefined,
        csrf: undefined,
      };
    }
    return JSON.parse(serializedState);
  } catch (error) {
    return {
      user: null,
      loading: false,
      errors: null,
      fingerprint: undefined,
      csrf: undefined,
    };
  }
};

const initialState = loadState();
const AuthReducer = (state: AuthState = initialState, action: AuthAction) => {
  let newState;

  switch (action.type) {
    case "START":
      newState = {
        ...state,
        loading: true,
        errors: null,
      };
      break;
    case "SUCCEEDED":
      newState = {
        ...state,
        loading: false,
        user: {
          ...action.payload.user,
          access_token: action.payload.access_token,
          refresh_token: action.payload.refresh_token,
        },
        fingerprint: action.payload.fingerprint || state.fingerprint,
        csrf: action.payload.csrf || state.csrf,
        errors: null,
      };
      break;
    case "FAILURE":
      newState = {
        ...state,
        loading: false,
        errors: action.payload,
      };
      break;
    case "REFRESH_TOKEN":
      if (state.user) {
        newState = {
          ...state,
          user: {
            ...state.user,
            ...action.payload.user,
            access_token: action.payload.access_token,
            refresh_token: action.payload.refresh_token,
          },
          fingerprint: action.payload.fingerprint || state.fingerprint,
          csrf: action.payload.csrf || state.csrf,
        };
      } else {
        newState = state;
      }
      break;
    case "LOGOUT":
      newState = {
        user: null,
        loading: false,
        errors: null,
        fingerprint: undefined,
        csrf: undefined,
      };
      // CLEAR THE LOCALSTORAGE ON LOGOUT FOR SECURITY.
      localStorage.removeItem("authState");
      return newState;

    default:
      newState = { ...state };
  }
  try {
    const storageState = {
      ...newState,
      fingerprint: undefined,
    };
    // save to local storage
    localStorage.setItem("authState", JSON.stringify(storageState));
  } catch (error) {
    console.error("could not save auth state:", error);
  }
  return newState;
};

export default AuthReducer;
