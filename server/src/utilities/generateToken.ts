import { Response } from "express";
import jwt from "jsonwebtoken";
import { IUserPayload } from "../interfaces/IUserPayload";

export const generateToken = (
	payload: IUserPayload,
	secret: string,
	expiresIn: string,
) => {
	return jwt.sign(payload, secret, {
		expiresIn: expiresIn,
	});
};

export const setTokensInCookies = (
	res: Response,
	access_token: string,
	refresh_token: string,
) => {
	res.cookie("access_token", access_token, {
		httpOnly: true,
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
		maxAge: 15 * 60 * 1000,
	});

	res.cookie("refresh_token", refresh_token, {
		httpOnly: true,
		sameSite: "strict",
		secure: process.env.NODE_ENV === "production",
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
};
