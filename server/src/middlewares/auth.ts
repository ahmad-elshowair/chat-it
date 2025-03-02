import { NextFunction, Response } from "express";
import { ICustomRequest } from "../interfaces/ICustomRequest";
import { verifyAccessToken } from "../utilities/verifyToken";

const authorizeUser = (
  req: ICustomRequest,
  res: Response,
  next: NextFunction
) => {
  const token =
    req.cookies.access_token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  console.log("access token from authorize function: ", token);

  if (!token) {
    return res.status(401).json({ message: "Access Token is missing!" });
  }
  try {
    const decodedUser = verifyAccessToken(token);
    if (!decodedUser) {
      return res.status(403).json({ message: "Invalid Access token" });
    }
    req.user = decodedUser;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid Access token" });
  }
};
export default authorizeUser;
