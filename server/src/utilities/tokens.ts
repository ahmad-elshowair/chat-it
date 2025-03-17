import { Response } from "express";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import config from "../configs/config";
import { IUserPayload } from "../interfaces/IUserPayload";

// Parse a duration string (like "7d", "15m") to milliseconds
export const getDurationInMs = (duration: string): number => {
  // Validate duration format
  if (!/^[0-9]+[smhd]$/.test(duration)) {
    throw new Error(
      "Invalid duration format. Must be a number followed by s, m, h, or d"
    );
  }

  const value = parseInt(duration.slice(0, -1), 10);
  const unit = duration.slice(-1);

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

// Calculate token expiration date from duration string
export const calculateExpirationDate = (duration: string): Date => {
  const durationMs = getDurationInMs(duration);
  return new Date(Date.now() + durationMs);
};

export const generateFingerprint = () => {
  return crypto.randomUUID();
};
export const hashFingerprint = (fingerprint: string) => {
  return require("crypto")
    .createHash("sha256")
    .update(fingerprint)
    .digest("hex");
};

export const generateToken = (
  payload: IUserPayload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"]
) => {
  const tokenPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID(),
  };
  return jwt.sign(tokenPayload, secret, { expiresIn, algorithm: "HS256" });
};

export const setTokensInCookies = (
  res: Response,
  access_token: string,
  refresh_token: string
) => {
  const secureCookiesOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: config.node_env === "production",
    path: "/",
    domain: config.node_env === "production" ? "chat-it.com" : "localhost",
  };

  // set access token as HttpOnly cookie
  res.cookie("__Host-access_token", access_token, {
    ...secureCookiesOptions,
    // Short-lived access token (15 minutes)
    maxAge: getDurationInMs(config.access_token_expiry),
  });

  // set refresh token as HttpOnly cookie
  res.cookie("__Host-refresh_token", refresh_token, {
    ...secureCookiesOptions,
    // Long-lived refresh token (7 days)
    maxAge: getDurationInMs(config.refresh_token_expiry),
  });

  // set a non-HttpOnly CSRF token if needed
  if (config.csrf_protection_enabled) {
    // GENERATE THE CSRF TOKEN.

    const csrfToken = require("crypto").randomBytes(32).toString("hex");

    // SET THE CSRF TOKEN IN COOKIES, ()
    res.cookie("__Secure-csrf_token", csrfToken, {
      ...secureCookiesOptions,
      httpOnly: false,
      maxAge: getDurationInMs(config.access_token_expiry),
    });

    // ALSO SET THE TOKEN IN THE RESPONSE HEADER FOR SPA FIRST LOAD.
    res.setHeader("X-CSRF-Token", csrfToken);
  }
};

export const clearAuthCookies = (res: Response) => {
  const cookiesOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: config.node_env === "production",
    domain: config.node_env === "production" ? "chat-it.com" : "localhost",
  };

  // Clear access token cookie
  res.clearCookie("__Host-access_token", {
    ...cookiesOptions,
    path: "/",
  });

  // clear the refresh token cookie
  res.clearCookie("__Host-refresh_token", {
    ...cookiesOptions,
    path: "/",
  });

  // Clear CSRF token if it exists
  if (config.csrf_protection_enabled) {
    res.clearCookie("__Secure-csrf_token", {
      ...cookiesOptions,
      httpOnly: false,
      path: "/",
    });
  }
};

export const verifyAccessToken = (token: string): IUserPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;
    return {
      id: decoded.id,
      is_admin: decoded.is_admin,
      fingerprint: decoded.fingerprint,
    };
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): IUserPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt_refresh_secret) as JwtPayload;
    return {
      id: decoded.id,
      is_admin: decoded.is_admin,
      fingerprint: decoded.fingerprint,
    };
  } catch (error) {
    return null;
  }
};
