// Controlador de Transacciones v3
import { Response } from "express";
import { TransactionService } from "../services/transaction.service";
import { ApiResponse, AuthRequest } from "../types";
import { AuthService } from "../services/auth.service";

export const TransactionController = {
  async transfer(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const userId = req.user!.userId;
      // Verify PIN if provided or if user has one set
      if (req.body.transferPin) {
        await AuthService.verifyPin(userId, req.body.transferPin);
      }
      const data = await TransactionService.transfer(userId, req.body);
      if (data.status === "FAILED") {
        res.status(422).json({ success: false, message: "Saldo insuficiente para realizar la transferencia", data });
        return;
      }
      res.status(200).json({ success: true, message: "Transferencia realizada exitosamente", data });
    } catch (error: any) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message || "Error en la transferencia" });
    }
  },

  async deposit(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await TransactionService.deposit(req.user!.userId, req.body);
      res.status(200).json({ success: true, message: "Saldo acreditado exitosamente", data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Error al acreditar saldo" });
    }
  },

  async withdraw(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await TransactionService.withdraw(req.user!.userId, req.body);
      res.status(200).json({ success: true, message: "Retiro realizado exitosamente", data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Error al retirar saldo" });
    }
  },

  async getHistory(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { page, limit, dateFrom, dateTo } = req.query;
      const data = await TransactionService.getMyHistory(
        req.user!.userId,
        Number(page) || 1,
        Number(limit) || 20,
        dateFrom as string | undefined,
        dateTo as string | undefined
      );
      res.status(200).json({ success: true, message: "Historial obtenido", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Error al obtener historial" });
    }
  },

  async getReceipt(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await TransactionService.getReceipt(req.params.id, req.user!.userId);
      res.status(200).json({ success: true, message: "Comprobante obtenido", data });
    } catch (error: any) {
      const status = error.statusCode || 404;
      res.status(status).json({ success: false, message: error.message || "Error al obtener comprobante" });
    }
  },

  async getFailedTransactions(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await TransactionService.getFailedTransactions(Number(req.query.page) || 1, Number(req.query.limit) || 50);
      res.status(200).json({ success: true, message: "Transacciones fallidas obtenidas", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Error al obtener transacciones" });
    }
  },

  async getAdminStats(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await TransactionService.getAdminStats();
      res.status(200).json({ success: true, message: "Métricas obtenidas", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Error al obtener métricas" });
    }
  },
};
