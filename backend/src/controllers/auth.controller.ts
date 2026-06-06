// Controlador de autenticación v3
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { ApiResponse, AuthRequest } from "../types";

export const AuthController = {
  async register(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({ success: true, message: "¡Bienvenido a PayFlow! Tu cuenta fue creada exitosamente.", data: result });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({ success: false, message: error.message || "Error al registrarse" });
    }
  },

  async login(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json({ success: true, message: "Sesión iniciada correctamente", data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message || "Error al iniciar sesión" });
    }
  },

  async refresh(req: Request, res: Response<ApiResponse>): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) { res.status(400).json({ success: false, message: "refreshToken requerido" }); return; }
      const result = await AuthService.refreshSession(refreshToken);
      res.status(200).json({ success: true, message: "Token renovado", data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message || "Error al renovar sesión" });
    }
  },

  async logout(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await AuthService.logout(refreshToken);
      res.status(200).json({ success: true, message: "Sesión cerrada" });
    } catch {
      res.status(500).json({ success: false, message: "Error al cerrar sesión" });
    }
  },

  async submitKyc(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await AuthService.submitKyc(userId, req.body);
      res.status(200).json({ success: true, message: "Identidad verificada. Tu cuenta ya está activa.", data: result });
    } catch (error: any) {
      const statusCode = error.statusCode || 400;
      res.status(statusCode).json({ success: false, message: error.message || "Error en verificación KYC" });
    }
  },

  async setPin(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await AuthService.setPin(userId, req.body);
      res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Error al configurar PIN" });
    }
  },
};
