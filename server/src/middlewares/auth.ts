import { NextFunction, Response } from "express";
import config from "../configs/config";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import { verifyAccessToken } from "../utilities/tokens";

const authorizeUser = (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookie first (preferred) or from Authorization header if not in cookie.
    const token =
      req.cookies["__Host-access_token"] ||
      (req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        message: "Authentication Required",
        error: "Access Token is missing!",
      });
    }

    // Verify the access token
    const decodedUser = verifyAccessToken(token);

    if (!decodedUser) {
      return res.status(403).json({
        message: "Authentication Failed",
        error: "Invalid or Expired Access token",
      });
    }

    // CSRF Protection (if enabled)

    if (config.csrf_protection_enabled) {
      // NORMALIZE AND CHECK FOR CSRF TOKEN IN VARIOUS HEADERS(case-insensitive).
      const csrfToken = (req.headers["x-csrf-token"] ||
        req.headers["csrf-token"] ||
        req.headers["X-CSRF-Token"] ||
        req.headers["CSRF-Token"]) as string;

      const storedCsrfToken = req.cookies["__Secure-csrf_token"];

      // PROPER VALIDATION OF TOKEN PRESENCE AND FORMAT.

      if (!csrfToken || typeof csrfToken !== "string") {
        return res.status(403).json({
          message: "Authentication failed",
          error: "Missing or Invalid CSRF token format!",
        });
      }

      if (!storedCsrfToken) {
        return res.status(403).json({
          message: "Authentication failed",
          error: "Missing CSRF cookie!",
        });
      }

      // USE CONSTANT-TIME COMPARISON TO PREVENT TIMING ATTACKS.
      const crypto = require("crypto");
      try {
        const tokenMatch = crypto.timingSafeEqual(
          Buffer.from(csrfToken, "utf8"),
          Buffer.from(storedCsrfToken, "utf8")
        );
        if (!tokenMatch) {
          return res.status(403).json({
            message: "Authentication failed",
            error: "CSRF token mismatch!",
          });
        }
      } catch (error) {
        return res.status(403).json({
          message: "Authentication failed",
          error: "Failed to verify CSRF token!",
        });
      }
    }

    // Fingerprint verification (if token contains fingerprint)
    if (decodedUser.fingerprint) {
      const fingerprint = req.headers["x-fingerprint"] as string;

      if (!fingerprint) {
        return res.status(403).json({
          message: "Authentication failed",
          error: "Fingerprint is missing",
        });
      }
      // Hash the fingerprint to compare with the one in the token
      const fingerprintHash = require("crypto")
        .createHash("sha256")
        .update(fingerprint)
        .digest("hex");

      if (decodedUser.fingerprint !== fingerprintHash) {
        return res.status(403).json({
          message: "Authentication failed",
          error: "Invalid token fingerprint",
        });
      }
    }

    // Attach user info to request object
    req.user = decodedUser;

    // Continue to the protected route
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Authentication Failed",
      error: "Invalid Access token",
    });
  }
};
export default authorizeUser;
