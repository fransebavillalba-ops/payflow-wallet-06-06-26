// Controlador del Mercado Simulado
import { Response } from "express";
import { MarketService } from "../services/market.service";
import { AdminService } from "../services/admin.service";
import { ApiResponse, AuthRequest } from "../types";
import { logAudit } from "../utils/audit";

export const MarketController = {
  async getAssets(_req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await MarketService.getAssets();
      res.status(200).json({ success: true, message: "Activos obtenidos", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getAsset(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await MarketService.getAsset(req.params.id);
      res.status(200).json({ success: true, message: "Activo obtenido", data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async trade(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await MarketService.trade(req.user!.userId, req.body);
      res.status(200).json({ success: true, message: "Operación simulada realizada. ⚠️ Dinero ficticio.", data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getPortfolio(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await MarketService.getPortfolio(req.user!.userId);
      res.status(200).json({ success: true, message: "Portafolio obtenido", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // Admin
  async adminCreateAsset(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await MarketService.createAsset(req.body);
      await logAudit(req.user!.userId, "ADMIN_CREATE_MARKET_ASSET", { symbol: req.body.symbol });
      res.status(201).json({ success: true, message: "Activo creado", data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async adminUpdateAsset(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await MarketService.updateAsset(req.params.id, req.body);
      await logAudit(req.user!.userId, "ADMIN_UPDATE_MARKET_ASSET", { assetId: req.params.id });
      res.status(200).json({ success: true, message: "Activo actualizado", data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },
};

export const AdminController = {
  async getMetrics(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await (await import("../services/transaction.service")).TransactionService.getAdminStats();
      res.status(200).json({ success: true, message: "Métricas obtenidas", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getUsers(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.getUsers(Number(req.query.page) || 1, Number(req.query.limit) || 50);
      res.status(200).json({ success: true, message: "Usuarios obtenidos", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getUserById(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.getUserById(req.params.id);
      res.status(200).json({ success: true, message: "Usuario obtenido", data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  },

  async getWallets(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.getWallets(Number(req.query.page) || 1);
      res.status(200).json({ success: true, message: "Wallets obtenidas", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async blockWallet(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.blockWallet(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, message: data.message });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async unblockWallet(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.unblockWallet(req.user!.userId, req.params.id);
      res.status(200).json({ success: true, message: data.message });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async getTransactions(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.getTransactions(Number(req.query.page) || 1, 50, req.query.status as string | undefined);
      res.status(200).json({ success: true, message: "Transacciones obtenidas", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getAuditLogs(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.getAuditLogs(Number(req.query.page) || 1, 50, req.query.action as string | undefined);
      res.status(200).json({ success: true, message: "Audit logs obtenidos", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getPendingKyc(_req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.getPendingKyc();
      res.status(200).json({ success: true, message: "KYC pendientes obtenidos", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async approveKyc(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.approveKyc(req.user!.userId, req.params.userId);
      res.status(200).json({ success: true, message: data.message });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async rejectKyc(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.rejectKyc(req.user!.userId, req.params.userId, req.body.reason);
      res.status(200).json({ success: true, message: data.message });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  },

  async verifyLedger(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await AdminService.verifyLedger(req.user!.userId);
      res.status(200).json({ success: true, message: data.valid ? "Cadena íntegra" : "¡Cadena comprometida!", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
