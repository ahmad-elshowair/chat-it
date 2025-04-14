import { NextFunction, Request, Response } from "express";
import config from "../configs/config";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import { IUserPayload } from "../interfaces/IUserPayload";
import AuthModel from "../models/auth";
import RefreshTokenModel from "../models/refreshToken";
import UserModel from "../models/user";
import {
  calculateExpirationDate,
  clearAuthCookies,
  generateFingerprint,
  generateToken,
  hashFingerprint,
  setTokensInCookies,
  verifyRefreshToken,
} from "../utilities/tokens";

const auth_model = new AuthModel();
const user_model = new UserModel();
const refresh_token_model = new RefreshTokenModel();

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Generate a fingerprint for additional security
    const fingerprint = generateFingerprint();
    const hashedFingerprint = hashFingerprint(fingerprint);
    // Register the user.
    const user = await auth_model.register(req.body);

    const payload: IUserPayload = {
      id: user.user_id,
      is_admin: user.is_admin,
      fingerprint: hashedFingerprint,
    };

    // Generate access token - short lived (15 minutes)
    const access_token = generateToken(
      payload,
      config.jwt_access_secret,
      config.access_token_expiry
    );

    // Generate refresh token - long lived (7 days)
    const refresh_token = generateToken(
      payload,
      config.jwt_refresh_secret,
      config.refresh_token_expiry
    );

    // calculate the expiration date
    const expiresAt = calculateExpirationDate(config.refresh_token_expiry);

    // Create refresh token
    await refresh_token_model.createToken(
      user.user_id!,
      hashedFingerprint,
      expiresAt
    );

    // Set tokens in HttpOnly cookies
    setTokensInCookies(res, access_token, refresh_token);

    // Return minimal user info to client
    res.status(201).json({
      message: "Registered Successfully",
      user: {
        user_id: user.user_id,
        email: user.email,
        is_admin: user.is_admin,
        user_name: user.user_name,
        first_name: user.first_name,
        last_name: user.last_name,
        picture: user.picture,
        cover: user.cover,
      },
      ...(config.csrf_protection_enabled && {
        csrf: res.getHeader("X-CSRF-Token"),
      }),
      fingerprint: fingerprint,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, password } = req.body;
  try {
    // Generate a fingerprint for additional security
    const fingerprint = generateFingerprint();
    const hashedFingerprint = hashFingerprint(fingerprint);

    // Authenticate user
    const user = await auth_model.login(email, password);

    // Create payload with minimal required data and fingerprint
    const payload: IUserPayload = {
      id: user.user_id,
      is_admin: user.is_admin,
      fingerprint: hashedFingerprint,
    };

    // Generate access token - short lived (15 minutes)
    const access_token = generateToken(
      payload,
      config.jwt_access_secret,
      config.access_token_expiry
    );
    // Generate refresh token - long lived (7 days)
    const refresh_token = generateToken(
      payload,
      config.jwt_refresh_secret,
      config.refresh_token_expiry
    );

    // Calculate token expiration date (7 days from now)
    const expiresAt = calculateExpirationDate(config.refresh_token_expiry);

    // Revoke any existing refresh tokens for this user
    await refresh_token_model.revokeAllUserTokens(user.user_id!);

    // Create new refresh token
    await refresh_token_model.createToken(
      user.user_id!,
      hashedFingerprint,
      expiresAt
    );

    // Set tokens in HttpOnly cookies
    setTokensInCookies(res, access_token, refresh_token, fingerprint);

    // Return minimal user info to client
    res.status(201).json({
      message: "Login Successfully",
      user: {
        user_id: user.user_id,
        email: user.email,
        is_admin: user.is_admin,
        user_name: user.user_name,
        first_name: user.first_name,
        last_name: user.last_name,
        picture: user.picture,
        cover: user.cover,
      },
      ...(config.csrf_protection_enabled && {
        csrf: res.getHeader("X-CSRF-Token"),
      }),
      fingerprint: fingerprint,
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req: Request, res: Response) => {
  // Get refresh token from cookie only (don't accept from body)
  const refreshToken =
    config.node_env === "production"
      ? req.cookies["__Host-refresh_token"]
      : req.cookies["refresh_token"];

  // Get fingerprint from the request headers
  const fingerprint = req.headers["x-fingerprint"] as string;

  // Reject if no refresh token in cookies
  if (!refreshToken) {
    console.error(`[AUTH] Refresh token missing - IP: ${req.ip}`);
    return res.status(401).json({ message: "Refresh Token is Missing!" });
  }

  // Reject if no fingerprint in request
  if (!fingerprint || typeof fingerprint !== "string") {
    console.error(`[AUTH] Fingerprint missing or invalid - IP: ${req.ip}`);
    return res.status(401).json({ message: "Fingerprint is Missing!" });
  }

  // Verify refresh token
  const decodedUser = verifyRefreshToken(refreshToken);

  if (!decodedUser) {
    // Clear cookies on invalid token
    clearAuthCookies(res);
    return res.status(403).json({ message: "Token is invalid or expired!" });
  }

  // Hash the provided fingerprint
  const hashedFingerprint = hashFingerprint(fingerprint);

  // Verify that fingerprint matches the one in the token
  if (decodedUser.fingerprint !== hashedFingerprint) {
    // Clear cookies on invalid fingerprint
    clearAuthCookies(res);

    // Log potential token theft for security monitoring
    console.warn(`Potential token theft detected for user ${decodedUser.id}`);

    // Revoke all refresh tokens for this user
    await refresh_token_model.revokeAllUserTokens(decodedUser.id!);

    return res.status(403).json({ message: "Token validation failed!" });
  }

  // Verify that token exists in database and is not revoked.
  if (
    !(await refresh_token_model.verifyToken(decodedUser.id!, hashedFingerprint))
  ) {
    // Clear cookies on invalid token
    clearAuthCookies(res);
    return res.status(403).json({ message: "Token has been revoked!" });
  }

  // Create payload for new tokens
  const payload: IUserPayload = {
    id: decodedUser.id,
    is_admin: decodedUser.is_admin,
    fingerprint: hashedFingerprint,
  };

  // Generate new Access Token.
  const newAccessToken = generateToken(
    payload,
    config.jwt_access_secret,
    config.access_token_expiry
  );

  // Generate new Refresh Token.
  const newRefreshToken = generateToken(
    payload,
    config.jwt_refresh_secret,
    config.refresh_token_expiry
  );

  // Calculate token expiration date (7 days from now)
  const expiresAt = calculateExpirationDate(config.refresh_token_expiry);

  // Generate a new fingerprint for the new token
  const newFingerprint = generateFingerprint();
  const hashedNewFingerprint = hashFingerprint(newFingerprint);
  // Revoke the old token and create a new one
  await refresh_token_model.rotateToken(
    decodedUser.id!,
    hashedFingerprint,
    hashedNewFingerprint,
    expiresAt
  );

  // Set Cookies.
  setTokensInCookies(res, newAccessToken, newRefreshToken, newFingerprint);

  try {
    // Get user data
    const user = await user_model.getUserById(decodedUser.id!);

    // Return minimal user info to client
    res.json({
      message: "Tokens Refreshed Successfully!",
      user: {
        user_id: user.user_id,
        email: user.email,
        is_admin: user.is_admin,
        user_name: user.user_name,
        first_name: user.first_name,
        last_name: user.last_name,
        picture: user.picture,
        cover: user.cover,
      },
      ...(config.csrf_protection_enabled && {
        csrf: res.getHeader("X-CSRF-Token"),
      }),
      fingerprint: newFingerprint,
    });
  } catch (error) {
    // Clear cookies on error
    clearAuthCookies(res);
    res.status(500).json({
      message: "Failed to refresh tokens",
      error: (error as Error).message,
    });
  }
};

const logout = async (req: ICustomRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    console.log(
      `[AUTH] Logout attempt - User: ${userId || "unknown"}, IP: ${
        req.ip
      }, Time: ${new Date().toISOString()}`
    );
    if (userId) {
      // Update online status to false if user ID is available
      await user_model.updateOnlineStatus(userId, false);
      // Revoke all refresh tokens for this user
      await refresh_token_model.revokeAllUserTokens(userId);
    }

    // Clear all auth cookies
    clearAuthCookies(res);
    // Return success message
    res.status(200).json({ message: "Logout Successfully!" });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      message: "Error during logout",
      error: (error as Error).message,
    });
  }
};

const checkAuthStatus = async (req: ICustomRequest, res: Response) => {
  try {
    // IF USER IS ALREADY AUTHENTICATED VIA ACCESS TOKEN.
    if (req.user) {
      // FETCH USER DATA.
      const user = await user_model.getUserById(req.user.id!);
      return res.status(200).json({
        message: "Auth Status checked Successfully!",
        authenticated: true,
        user: {
          user_id: user.user_id,
          email: user.email,
          is_admin: user.is_admin,
          user_name: user.user_name,
          first_name: user.first_name,
          last_name: user.last_name,
          picture: user.picture,
          cover: user.cover,
        },
        ...(config.csrf_protection_enabled && {
          csrf: res.getHeader("X-CSRF-Token"),
        }),
      });
    }

    const refreshTokenName =
      config.node_env === "production"
        ? "__Host-refresh_token"
        : "refresh_token";
    const refreshToken = req.cookies[refreshTokenName];

    // IF NO REFRESH TOKEN, USER US NOT AUTHENTICATED.
    if (!refreshToken) {
      return res.status(200).json({
        message: "Auth status checked successfully!",
        authenticated: false,
      });
    }

    // VERIFY REFRESH TOKEN.
    const decodedUser = verifyRefreshToken(refreshToken);
    if (!decodedUser) {
      // CLEAR COOKIES ON INVALID TOKEN.
      clearAuthCookies(res);
      return res.status(200).json({
        message: "Auth status checked successfully!",
        authenticated: false,
      });
    }

    // GET fingerprint  IF AVAILABLE.
    const fingerprintName =
      config.node_env === "production"
        ? "__Host-x-fingerprint"
        : "x-fingerprint";

    const fingerprint =
      req.cookies[fingerprintName] || (req.headers[fingerprintName] as string);

    // IF WE HAVE fingerprint  IN TOKEN BUT IN REQUEST, SECURITY RISK.
    if (decodedUser.fingerprint && !fingerprint) {
      clearAuthCookies(res);
      return res.status(200).json({
        message: "Auth status checked successfully!",
        authenticated: false,
      });
    }
    // IF fingerprint AVAILABLE, VERIFY IT.
    if (fingerprint) {
      const hashedFingerprint = hashFingerprint(fingerprint);

      // IF fingerprint DOESN'T MATCH, SECURITY RISK.
      if (hashedFingerprint !== decodedUser.fingerprint) {
        clearAuthCookies(res);
        console.warn(
          `Potential token theft detected for user ${decodedUser.id}`
        );
        await refresh_token_model.revokeAllUserTokens(decodedUser.id!);
        return res.status(200).json({
          message: "Auth status checked successfully!",
          authenticated: false,
        });
      }

      // VERIFY TOKEN EXISTS IN THE DATABASE AND IS NOT REVOKED.
      if (
        !(await refresh_token_model.verifyToken(
          decodedUser.id!,
          hashedFingerprint
        ))
      ) {
        clearAuthCookies(res);
        return res.status(200).json({
          message: "Auth status checked successfully!",
          authenticated: false,
        });
      }
      // TOKEN IS VALID, GENERATE NEW TOKENS.
      const payload: IUserPayload = {
        id: decodedUser.id,
        is_admin: decodedUser.is_admin,
        fingerprint: hashedFingerprint,
      };

      // GENERATE NEW TOKEN.
      const newAccessToken = generateToken(
        payload,
        config.jwt_access_secret,
        config.access_token_expiry
      );
      const newRefreshToken = generateToken(
        payload,
        config.jwt_refresh_secret,
        config.refresh_token_expiry
      );

      // CALCULATE TOKEN EXPIRATION.
      const expireAt = calculateExpirationDate(config.refresh_token_expiry);

      // GENERATE NEW fingerprint  FOR ENHANCED SECURITY.
      const newFingerprint = generateFingerprint();
      const hashedNewFingerprint = hashFingerprint(newFingerprint);

      // ROTATE TOKEN IN DATABASE.
      await refresh_token_model.rotateToken(
        decodedUser.id!,
        hashedFingerprint,
        hashedNewFingerprint,
        expireAt
      );

      // SET NEW TOKENS IN COOKIES.
      setTokensInCookies(res, newAccessToken, newRefreshToken, newFingerprint);

      // FETCH USER DATA.
      try {
        const user = await user_model.getUserById(decodedUser.id!);

        // RETURN USER DATA.
        return res.status(200).json({
          message: "Auth status checked successfully!",
          authenticated: true,
          user: {
            user_id: user.user_id,
            email: user.email,
            is_admin: user.is_admin,
            user_name: user.user_name,
            first_name: user.first_name,
            last_name: user.last_name,
            picture: user.picture,
            cover: user.cover,
          },
          ...(config.csrf_protection_enabled && {
            csrf: res.getHeader("X-CSRF-Token"),
          }),
          fingerprint: newFingerprint,
        });
      } catch (error) {
        //  IF ERROR FETCHING USER, AUTHENTICATION FAILED.
        clearAuthCookies(res);
        console.error("Error fetching user data: ", error);
        return res.status(200).json({
          message: "Auth status checked successfully!",
          authenticated: false,
        });
      }
    }

    //  NO fingerprint BUT TOKEN IS VALID - UNUSUAL CASE.
    return res.status(200).json({
      message: "Auth status checked successfully!",
      authenticated: false,
    });
  } catch (error) {
    console.error("Check Auth Status Error:", error);
    res.status(500).json({
      message: "Error during check auth status",
      error: (error as Error).message,
    });
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
  checkAuthStatus,
};
