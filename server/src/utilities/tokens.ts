import { Response } from "express";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import config from "../configs/config";
import { IUserPayload } from "../interfaces/IUserPayload";

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
  res.cookie("access_token", access_token, {
    ...secureCookiesOptions,
    // Short-lived access token (15 minutes)
    maxAge: 15 * 60 * 1000,
  });

  // set refresh token as HttpOnly cookie
  res.cookie("refresh_token", refresh_token, {
    ...secureCookiesOptions,
    // Long-lived refresh token (7 days)
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth/refresh-token",
  });

  // set a non-HttpOnly CSRF token if needed
  if (config.node_env === "production") {
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
  res.clearCookie("access_token", {
    ...cookiesOptions,
    path: "/",
  });

  // clear the refresh token cookie
  res.clearCookie("refresh_token", {
    ...cookiesOptions,
    path: "/api/auth/refresh-token",
  });

  // Clear CSRF token if it exists
  if (config.csrf_protection_enabled) {
    res.clearCookie("csrf_token", {
      ...cookiesOptions,
      httpOnly: false,
      path: "/",
    });
  }
};

export const verifyAccessToken = (token: string): IUserPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;
    return { id: decoded.id, is_admin: decoded.is_admin };
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): IUserPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt_refresh_secret) as JwtPayload;
    return { id: decoded.id, is_admin: decoded.is_admin };
  } catch (error) {
    return null;
  }
};
