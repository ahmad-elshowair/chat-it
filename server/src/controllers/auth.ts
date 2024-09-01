import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../configs/config";
import { UserPayload } from "../interfaces/IUserPayload";
import AuthModel from "../models/auth";
import { generateToken } from "../utilities/generateToken";
const user_model = new AuthModel();

const register = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await user_model.register(req.body);
		const payload: UserPayload = {
			id: user.user_id,
			is_admin: user.is_admin,
		};
		// generate access token
		const accessToken = generateToken(payload, config.jwt_secret, "15m");
		// generate access token
		const refreshToken = generateToken(
			payload,
			config.jwt_refresh_secret,
			"7d",
		);

		res.cookie("access_token", accessToken, {
			httpOnly: true,
			sameSite: "strict",
			secure: true,
			maxAge: 15 * 60 * 1000,
		});

		res.cookie("refresh_token", refreshToken, {
			httpOnly: true,
			sameSite: "strict",
			secure: true,
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		res.status(201).json({ message: "Register Successfully", user });
	} catch (error) {
		next(error);
	}
};

// login user
const login = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	const { email, password } = req.body;
	try {
		const user = await user_model.login(email, password);

		const payload: UserPayload = {
			id: user.user_id,
			is_admin: user.is_admin,
		};

		// generate access token
		const accessToken = generateToken(payload, config.jwt_secret, "15m");
		// generate access token
		const refreshToken = generateToken(payload, config.jwt_secret, "7d");

		res.cookie("access_token", accessToken, {
			httpOnly: true,
			sameSite: "strict",
			secure: true,
			maxAge: 15 * 60 * 1000,
		});

		res.cookie("refresh_token", refreshToken, {
			httpOnly: true,
			sameSite: "strict",
			secure: true,
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		res.status(201).json({ message: "Login Successfully", user });
	} catch (error) {
		next(error);
	}
};

// Refresh Token
const refreshToken = async (req: Request, res: Response) => {
	const refreshToken = req.cookies.refresh_token;
	if (!refreshToken) {
		return res.status(401).json({ message: "Refresh Token is Missing!" });
	}
	try {
		const decoded = jwt.verify(
			refreshToken,
			config.jwt_refresh_secret,
		) as JwtPayload;

		if (!decoded) {
			return res.status(403).json({ message: "token is invalid!" });
		}

		const payload: UserPayload = { id: decoded.id, is_admin: decoded.is_admin };

		// Generate new Access Token.
		const newAccessToken = generateToken(payload, config.jwt_secret, "15m");

		res.cookie("access_token", newAccessToken, {
			httpOnly: true,
			sameSite: "strict",
			secure: true,
			maxAge: 15 * 60 * 1000, // 15 minutes
		});
		res.json({
			message: "Access Token Refreshed",
			access_token: newAccessToken,
		});
	} catch (error) {
		return res.status(403).json({ message: "Invalid Refresh Token!" });
	}
};

const logout = (req: Request, res: Response) => {
	res.clearCookie("access_token");
	res.clearCookie("refresh_token");
	res.status(200).json({ message: "Logout Successfully!" });
};
export default {
	register,
	login,
	refreshToken,
	logout,
};
