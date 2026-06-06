// Rutas PayFlow v3

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller";
import { WalletController } from "../controllers/wallet.controller";
import { TransactionController } from "../controllers/transaction.controller";
import { NotificationController } from "../controllers/notification.controller";
import { PaymentRequestController } from "../controllers/payment-request.controller";
import { MarketController, AdminController } from "../controllers/market.controller";
import { KycController } from "../controllers/kyc.controller";
import { authenticate, requireAdmin } from "../middleware/auth.middleware";

const router = Router();

// ── Rate limiters ──────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Demasiados intentos. Intentá en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const transferLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: "Límite de transferencias alcanzado. Intentá en 1 minuto." },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: "Demasiadas peticiones. Intentá más tarde." },
});

router.use(generalLimiter);

// ── AUTH ──────────────────────────────────────────────
router.post("/auth/register", authLimiter, AuthController.register);
router.post("/auth/login",    authLimiter, AuthController.login);
router.post("/auth/refresh",  AuthController.refresh);
router.post("/auth/logout",   authenticate, AuthController.logout);

// ── PIN ───────────────────────────────────────────────
router.post("/pin/set",       authenticate, AuthController.setPin);

// ── WALLET ────────────────────────────────────────────
router.get("/wallet/me",                    authenticate, WalletController.getMyWallet);
router.get("/wallet/qr",                    authenticate, WalletController.getQrData);
router.get("/wallet/find/:alias",           authenticate, WalletController.findByAlias);
router.get("/wallet/cvu/:cvu",              authenticate, WalletController.findByCvu);
router.get("/wallet/contacts",              authenticate, WalletController.getContacts);
router.post("/wallet/contacts",             authenticate, WalletController.addContact);
router.delete("/wallet/contacts/:alias",    authenticate, WalletController.removeContact);

// ── TRANSACCIONES ─────────────────────────────────────
router.post("/transactions/transfer",       authenticate, transferLimiter, TransactionController.transfer);
router.get("/transactions/history",         authenticate, TransactionController.getHistory);
router.post("/transactions/deposit",        authenticate, TransactionController.deposit);
router.post("/transactions/withdraw",       authenticate, TransactionController.withdraw);
router.get("/transactions/:id/receipt",     authenticate, TransactionController.getReceipt);

// ── NOTIFICACIONES ────────────────────────────────────
router.get("/notifications",                authenticate, NotificationController.getMyNotifications);
router.patch("/notifications/:id/read",     authenticate, NotificationController.markAsRead);
router.patch("/notifications/read-all",     authenticate, NotificationController.markAllAsRead);

// ── SOLICITUDES DE PAGO ───────────────────────────────
router.post("/payment-requests",            authenticate, PaymentRequestController.create);
router.get("/payment-requests/received",    authenticate, PaymentRequestController.listReceived);
router.get("/payment-requests/sent",        authenticate, PaymentRequestController.listSent);
router.post("/payment-requests/:id/accept", authenticate, PaymentRequestController.accept);
router.post("/payment-requests/:id/reject", authenticate, PaymentRequestController.reject);

// ── MERCADO SIMULADO ──────────────────────────────────
router.get("/market/assets",                authenticate, MarketController.getAssets);
router.get("/market/assets/:id",            authenticate, MarketController.getAsset);
router.post("/market/trade",                authenticate, MarketController.trade);
router.get("/market/portfolio",             authenticate, MarketController.getPortfolio);

// ── KYC ───────────────────────────────────────────────
router.get("/kyc/me",                       authenticate, KycController.getMyKyc);
router.post("/kyc/submit",                  authenticate, KycController.submit);
// KYC image (admin only)
router.get("/kyc/image/:filename",          authenticate, requireAdmin, KycController.getImage);

// ── ADMIN ─────────────────────────────────────────────
router.get("/admin/metrics",                authenticate, requireAdmin, AdminController.getMetrics);
router.get("/admin/users",                  authenticate, requireAdmin, AdminController.getUsers);
router.get("/admin/users/:id",              authenticate, requireAdmin, AdminController.getUserById);
router.get("/admin/wallets",                authenticate, requireAdmin, AdminController.getWallets);
router.patch("/admin/wallets/:id/block",    authenticate, requireAdmin, AdminController.blockWallet);
router.patch("/admin/wallets/:id/unblock",  authenticate, requireAdmin, AdminController.unblockWallet);
router.get("/admin/transactions",           authenticate, requireAdmin, AdminController.getTransactions);
router.get("/admin/transactions/failed",    authenticate, requireAdmin, TransactionController.getFailedTransactions);
router.get("/admin/audit-logs",             authenticate, requireAdmin, AdminController.getAuditLogs);
router.get("/admin/kyc/pending",            authenticate, requireAdmin, AdminController.getPendingKyc);
router.get("/admin/kyc/verifications",       authenticate, requireAdmin, KycController.listAll);
router.patch("/admin/kyc/verifications/:id/approve", authenticate, requireAdmin, KycController.approve);
router.patch("/admin/kyc/verifications/:id/reject",  authenticate, requireAdmin, KycController.reject);
router.patch("/admin/kyc/:userId/approve",  authenticate, requireAdmin, AdminController.approveKyc);
router.patch("/admin/kyc/:userId/reject",   authenticate, requireAdmin, AdminController.rejectKyc);
router.get("/admin/ledger/verify",          authenticate, requireAdmin, AdminController.verifyLedger);
router.get("/admin/market/assets",          authenticate, requireAdmin, MarketController.getAssets);
router.post("/admin/market/assets",         authenticate, requireAdmin, MarketController.adminCreateAsset);
router.patch("/admin/market/assets/:id",    authenticate, requireAdmin, MarketController.adminUpdateAsset);

export default router;
