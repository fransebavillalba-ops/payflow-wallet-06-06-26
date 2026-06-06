// Controlador de solicitudes de pago
import { Response } from "express";
import { PaymentRequestService } from "../services/payment-request.service";
import { ApiResponse, AuthRequest } from "../types";

export const PaymentRequestController = {
  async create(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await PaymentRequestService.create(req.user!.userId, req.body);
      res.status(201).json({ success: true, message: "Solicitud de pago creada", data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async listReceived(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await PaymentRequestService.listReceived(req.user!.userId);
      res.status(200).json({ success: true, message: "Solicitudes recibidas", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async listSent(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await PaymentRequestService.listSent(req.user!.userId);
      res.status(200).json({ success: true, message: "Solicitudes enviadas", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async accept(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await PaymentRequestService.accept(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, message: "Solicitud aceptada. Transferencia realizada.", data });
    } catch (error: any) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async reject(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await PaymentRequestService.reject(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, message: data.message });
    } catch (error: any) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },
};
