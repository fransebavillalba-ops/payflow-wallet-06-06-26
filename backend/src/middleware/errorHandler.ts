// Error handler centralizado — mantenido por compatibilidad
import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[ErrorHandler]", err?.message || err);
  const statusCode = err?.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Error interno del servidor" : err.message,
  });
}
