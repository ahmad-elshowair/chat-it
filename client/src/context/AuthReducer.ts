import { AuthAction, AuthState } from "../types/auth";

export const initialState: AuthState = {
  user: null,
  loading: false,
  errors: null,
  fingerprint: undefined,
  csrf: undefined,
  authChecked: false,
};
const AuthReducer = (state: AuthState = initialState, action: AuthAction) => {
  let newState;

  switch (action.type) {
    case "START":
      newState = {
        ...state,
        loading: true,
      };
      break;
    case "SUCCEEDED":
      newState = {
        ...state,
        loading: false,
        user: {
          ...action.payload.user,
        },
        fingerprint: action.payload.fingerprint || state.fingerprint,
        csrf: action.payload.csrf || state.csrf,
        authChecked: true,
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
          },
          fingerprint: action.payload.fingerprint || state.fingerprint,
          csrf: action.payload.csrf || state.csrf,
          authChecked: true,
        };
      } else {
        newState = state;
      }
      break;
    case "LOGOUT":
      newState = {
        ...initialState,
        authChecked: true,
      };
      return newState;
    case "CHECK_AUTH_STATUS":
      newState = {
        ...state,
        authChecked: true,
        ...(action.payload === false && state.user ? { user: null } : {}),
      };
      break;

    default:
      newState = { ...state };
  }
  return newState;
};

export default AuthReducer;
