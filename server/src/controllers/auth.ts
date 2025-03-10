import { NextFunction, Request, Response } from "express";
import config from "../configs/config";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import { IUserPayload } from "../interfaces/IUserPayload";
import AuthModel from "../models/auth";
import UserModel from "../models/user";
import { generateToken, setTokensInCookies } from "../utilities/generateToken";
import { verifyRefreshToken } from "../utilities/verifyToken";
const user_model = new AuthModel();

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await user_model.register(req.body);
    const payload: IUserPayload = {
      id: user.user_id,
      is_admin: user.is_admin,
    };
    // generate access token
    const access_token = generateToken(payload, config.jwt_secret, "15m");
    // generate access token
    const refresh_token = generateToken(
      payload,
      config.jwt_refresh_secret,
      "7d"
    );

    setTokensInCookies(res, access_token, refresh_token);

    res.status(201).json({
      message: "Registered Successfully",
      user: {
        user_id: user.user_id,
        email: user.email,
        is_admin: user.is_admin,
        user_name: user.user_name,
      },
      access_token,
      refresh_token,
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
    const user = await user_model.login(email, password);

    const payload: IUserPayload = {
      id: user.user_id,
      is_admin: user.is_admin,
    };

    // generate access token
    const access_token = generateToken(payload, config.jwt_secret, "15m");
    // generate access token
    const refresh_token = generateToken(payload, config.jwt_secret, "7d");

    setTokensInCookies(res, access_token, refresh_token);

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
      access_token,
      refresh_token,
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req: Request, res: Response) => {
  // GET REFRESH TOKEN FROM COOKIES OR REQUEST BODY
  const refreshToken =
    req.cookies.refresh_token ||
    (req.body.refresh_token && req.body.refresh_token);

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh Token is Missing!" });
  }

  const decodedUser = verifyRefreshToken(refreshToken);

  if (!decodedUser) {
    return res.status(403).json({ message: "token is invalid!" });
  }

  const payload: IUserPayload = {
    id: decodedUser.id,
    is_admin: decodedUser.is_admin,
  };

  // Generate new Access Token.
  const newAccessToken = generateToken(payload, config.jwt_secret, "15m");

  // Generate new Refresh Token.
  const newRefreshToken = generateToken(
    payload,
    config.jwt_refresh_secret,
    "7d"
  );

  // Set Cookies.
  setTokensInCookies(res, newAccessToken, newRefreshToken);

  try {
    const userModel = new UserModel();

    const user = await userModel.getUserById(decodedUser.id!);
    res.json({
      message: "Tokens Refreshed Successfully!",
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
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
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to refresh tokens",
      error: (error as Error).message,
    });
  }
};

const logout = async (req: ICustomRequest, res: Response) => {
  try {
    // Get user ID from request
    const userId = req.user?.id;
    // Update online status to false if user ID is available
    if (userId) {
      const userModel = new UserModel();
      await userModel.updateOnlineStatus(userId, false);
    }

    // Clear cookies
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.status(200).json({ message: "Logout Successfully!" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({
      message: "Failed to logout",
      error: (error as Error).message,
    });
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
};
