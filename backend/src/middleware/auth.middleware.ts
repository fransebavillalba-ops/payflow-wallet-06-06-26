// Middlewares de autenticación y autorización

import { Response, NextFunction } from "express";
import { AuthRequest, ApiResponse } from "../types";
import { verifyToken } from "../utils/jwt";

export function authenticate(
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Token de acceso requerido" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Token inválido o expirado. Iniciá sesión nuevamente.",
    });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response<ApiResponse>,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({
      success: false,
      message: "Acceso denegado. Se requieren permisos de administrador.",
    });
    return;
  }
  next();
}
