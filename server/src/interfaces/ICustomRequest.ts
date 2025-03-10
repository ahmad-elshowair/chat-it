import { Request } from "express";
export interface ICustomRequest extends Request {
  user?: any;
  fingerprint?: string;
}
