// Utilidades JWT - Access token corto + Refresh token largo

import jwt from "jsonwebtoken";
import { JwtPayload } from "../types";

const ACCESS_SECRET  = process.env.JWT_SECRET         || "payflow_access_secret_dev";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "payflow_refresh_secret_dev";
const ACCESS_EXPIRES  = process.env.JWT_EXPIRES_IN     || "15m";
const REFRESH_EXPIRES = "7d";

export function generateToken(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

export function getRefreshExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}
