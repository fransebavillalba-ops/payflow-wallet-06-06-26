// Tipos globales del sistema PayFlow v3

import { Request } from "express";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "USER" | "ADMIN";
  type?: "access" | "refresh";
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface TransferDTO {
  receiverAlias: string;
  amount: number;
  concept: string;
  idempotencyKey: string;
  transferPin?: string;
}

export interface FundDTO {
  amount: number;
  concept?: string;
}

export interface ContactDTO {
  alias: string;
  label?: string;
}
