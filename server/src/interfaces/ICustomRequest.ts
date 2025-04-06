import { Request } from "express";
import { IUserPayload } from "./IUserPayload";
export interface ICustomRequest extends Request {
  user?: IUserPayload;
  fingerprint?: string;
}
