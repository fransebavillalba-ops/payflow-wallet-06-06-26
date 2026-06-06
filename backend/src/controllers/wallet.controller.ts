// Controlador de Wallet v3
import { Response } from "express";
import { WalletService } from "../services/wallet.service";
import { ApiResponse, AuthRequest, ContactDTO } from "../types";

export const WalletController = {
  async getMyWallet(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await WalletService.getMyWallet(req.user!.userId);
      res.status(200).json({ success: true, message: "Wallet obtenida", data });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || "Wallet no encontrada" });
    }
  },

  async findByAlias(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await WalletService.findByAlias(req.params.alias);
      if (!data) { res.status(404).json({ success: false, message: "Wallet no encontrada" }); return; }
      res.status(200).json({ success: true, message: "Wallet encontrada", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Error al buscar wallet" });
    }
  },

  async findByCvu(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await WalletService.findByCvu(req.params.cvu);
      if (!data) { res.status(404).json({ success: false, message: "Wallet no encontrada" }); return; }
      res.status(200).json({ success: true, message: "Wallet encontrada", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Error al buscar wallet" });
    }
  },

  async getQrData(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const { amount, concept } = req.query;
      const data = await WalletService.getQrData(
        req.user!.userId,
        amount ? Number(amount) : undefined,
        concept as string | undefined
      );
      res.status(200).json({ success: true, message: "Datos QR generados", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Error al generar QR" });
    }
  },

  async getContacts(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await WalletService.getContacts(req.user!.userId);
      res.status(200).json({ success: true, message: "Contactos obtenidos", data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Error al obtener contactos" });
    }
  },

  async addContact(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      const data = await WalletService.addContact(req.user!.userId, req.body as ContactDTO);
      res.status(201).json({ success: true, message: "Contacto guardado", data });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Error al guardar contacto" });
    }
  },

  async removeContact(req: AuthRequest, res: Response<ApiResponse>): Promise<void> {
    try {
      await WalletService.removeContact(req.user!.userId, req.params.alias);
      res.status(200).json({ success: true, message: "Contacto eliminado" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Error al eliminar contacto" });
    }
  },
};
