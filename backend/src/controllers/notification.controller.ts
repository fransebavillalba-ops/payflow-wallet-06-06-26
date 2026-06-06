// Controlador de notificaciones
import { Response } from "express";
import { NotificationService } from "../services/notification.service";
import { ApiResponse, AuthRequest } from "../types";

export const NotificationController = {
  async getMyNotifications(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await NotificationService.getMyNotifications(req.user!.userId, Number(req.query.page) || 1);
      res.status(200).json({ success: true, message: "Notificaciones obtenidas", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async markAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      await NotificationService.markAsRead(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, message: "Notificación marcada como leída" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async markAllAsRead(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      await NotificationService.markAllAsRead(req.user!.userId);
      res.status(200).json({ success: true, message: "Notificaciones marcadas como leídas" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
