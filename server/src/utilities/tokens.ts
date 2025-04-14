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
  refresh_token: string,
  fingerprint?: string
) => {
  const cookieConfigs = {
    httpOnly: true,
    sameSite:
      config.node_env === "development"
        ? ("none" as const)
        : config.node_env === "production"
        ? ("strict" as const)
        : ("lax" as const),
    secure:
      config.node_env === "production" || config.node_env === "development",
    path: "/",
  };

  // SET COOKIES BASED ON ENVIRONMENT.
  if (config.node_env === "development") {
    res.cookie("access_token", access_token, {
      ...cookieConfigs,
      maxAge: getDurationInMs(config.access_token_expiry),
    });

    res.cookie("refresh_token", refresh_token, {
      ...cookieConfigs,
      path: "/",
      maxAge: getDurationInMs(config.refresh_token_expiry),
    });

    if (fingerprint) {
      res.cookie("x-fingerprint", fingerprint, {
        ...cookieConfigs,
        httpOnly: false,
        maxAge: getDurationInMs(config.access_token_expiry),
      });
    }

    // SET A NON-HTTPONLY CSRF TOKEN IF NEEDED.
    if (config.csrf_protection_enabled) {
      // GENERATE THE CSRF TOKEN.
      const csrfToken = require("crypto").randomBytes(32).toString("hex");

      // SET THE CSRF TOKEN IN COOKIES.
      res.cookie("csrf_token", csrfToken, {
        ...cookieConfigs,
        maxAge: getDurationInMs(config.access_token_expiry),
      });

      // ALSO SET THE TOKEN IN THE RESPONSE HEADER FOR SPA FIRST LOAD.
      res.setHeader("X-CSRF-Token", csrfToken);
    }
  } else {
    res.cookie("__Host-access_token", access_token, {
      ...cookieConfigs,
      maxAge: getDurationInMs(config.access_token_expiry),
    });

    res.cookie("__Host-refresh_token", refresh_token, {
      ...cookieConfigs,
      path: "/",
      maxAge: getDurationInMs(config.refresh_token_expiry),
    });

    if (fingerprint) {
      res.cookie("__Host-x-fingerprint", fingerprint, {
        ...cookieConfigs,
        httpOnly: false,
        maxAge: getDurationInMs(config.access_token_expiry),
      });
    }
    // SET A NON-HTTPONLY CSRF TOKEN IF NEEDED.
    if (config.csrf_protection_enabled) {
      // GENERATE THE CSRF TOKEN.
      const csrfToken = require("crypto").randomBytes(32).toString("hex");

      // SET THE CSRF TOKEN IN COOKIES.
      res.cookie("__Secure-csrf_token", csrfToken, {
        ...cookieConfigs,
        httpOnly: false,
        maxAge: getDurationInMs(config.access_token_expiry),
      });

      // ALSO SET THE TOKEN IN THE RESPONSE HEADER FOR SPA FIRST LOAD.
      res.setHeader("X-CSRF-Token", csrfToken);
    }
  }
};

export const clearAuthCookies = (res: Response) => {
  const cookiesOptions = {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: config.node_env === "production",
  };

  // CLEAR COOKIES BASE ON ENVIRONMENT.
  if (config.node_env === "development") {
    res.clearCookie("access_token", { ...cookiesOptions, path: "/" });
    res.clearCookie("refresh_token", { ...cookiesOptions, path: "/" });
    // Clear CSRF token if it exists
    if (config.csrf_protection_enabled) {
      res.clearCookie("csrf_token", { ...cookiesOptions, path: "/" });
    }

    res.clearCookie("x-fingerprint", { ...cookiesOptions, path: "/" });
  } else {
    res.clearCookie("__Host-access_token", {
      ...cookiesOptions,
      secure: true,
      path: "/",
    });
    res.clearCookie("__Host-refresh_token", {
      ...cookiesOptions,
      secure: true,
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

    res.clearCookie("__Host-x-fingerprint", { ...cookiesOptions, path: "/" });
  }
};

export const verifyAccessToken = (token: string): IUserPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt_access_secret) as JwtPayload;

    // ADDITIONAL VALIDATION CHECKS.
    if (!decoded.id || !decoded.fingerprint) {
      console.warn("Token missing required fields!");
      return null;
    }

    return {
      id: decoded.id,
      is_admin: decoded.is_admin,
      fingerprint: decoded.fingerprint,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error("Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error("Invalid token");
    }
    return null;
  }
};

export const verifyRefreshToken = (token: string): IUserPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt_refresh_secret) as JwtPayload;

    // ADDITIONAL VALIDATION CHECKS.
    if (!decoded.id || !decoded.fingerprint) {
      console.warn("Token missing required fields!");
      return null;
    }

    return {
      id: decoded.id,
      is_admin: decoded.is_admin,
      fingerprint: decoded.fingerprint,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error("Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error("Invalid token");
    }
    return null;
  }
};
