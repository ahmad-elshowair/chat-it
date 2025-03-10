import { NextFunction, Response } from "express";
import config from "../configs/config";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import { verifyAccessToken } from "../utilities/verifyToken";

const authorizeUser = (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from cookie first (preferred) or from Authorization header if not in cookie.
    const token =
      req.cookies.access_token ||
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
      const csrfToken =
        req.headers["x-csrf-token"] || req.headers["csrf-token"];
      const storedCsrfToken = req.cookies.csrf_token;

      if (!csrfToken || csrfToken !== storedCsrfToken) {
        return res.status(403).json({
          message: "Authentication failed",
          error: "CSRF token validation failed",
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
