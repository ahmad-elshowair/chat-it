import { Response } from "express";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import config from "../configs/config";
import { IUserPayload } from "../interfaces/IUserPayload";

export const generateToken = (
  payload: IUserPayload,
  secret: Secret,
  expiresIn: SignOptions["expiresIn"]
) => {
  return jwt.sign(payload, secret, { expiresIn });
};

export const setTokensInCookies = (
  res: Response,
  access_token: string,
  refresh_token: string
) => {
  res.cookie("access_token", access_token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.node_env === "production",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refresh_token", refresh_token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.node_env === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};
