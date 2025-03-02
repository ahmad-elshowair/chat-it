import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../configs/config";
import { IUserPayload } from "../interfaces/IUserPayload";

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
