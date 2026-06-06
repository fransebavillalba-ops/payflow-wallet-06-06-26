// Controlador KYC
import { Response } from "express";
import path from "path";
import { KycService } from "../services/kyc.service";
import { ApiResponse, AuthRequest } from "../types";

export const KycController = {
  async getMyKyc(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await KycService.getMyKyc(req.user!.userId);
      res.status(200).json({ success: true, message: "Estado KYC obtenido", data });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async submit(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await KycService.submit(req.user!.userId, req.body);
      res.status(201).json({ success: true, message: "Verificación enviada. Será revisada por un administrador.", data });
    } catch (e: any) {
      const status = e.statusCode || 400;
      res.status(status).json({ success: false, message: e.message });
    }
  },

  // Admin
  async listAll(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { status } = req.query;
      const data = await KycService.listAll(status as string | undefined);
      res.status(200).json({ success: true, message: "Verificaciones obtenidas", data });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async approve(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await KycService.approve(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, message: data.message });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message });
    }
  },

  async reject(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { reason } = req.body;
      if (!reason?.trim()) { res.status(400).json({ success: false, message: "El motivo de rechazo es requerido" }); return; }
      const data = await KycService.reject(req.user!.userId, req.params.id, reason);
      res.status(200).json({ success: true, message: data.message });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message });
    }
  },

  async getImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const filename = req.params.filename;
      // Sanitize: no path traversal
      if (filename.includes("..") || filename.includes("/")) {
        res.status(400).json({ success: false, message: "Nombre de archivo inválido" });
        return;
      }
      const fullPath = KycService.getImagePath(filename);
      if (!fullPath) { res.status(404).json({ success: false, message: "Imagen no encontrada" }); return; }
      res.sendFile(path.resolve(fullPath));
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
};
