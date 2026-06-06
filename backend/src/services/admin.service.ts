// Servicio de administración v3
import prisma from "../utils/prisma";
import { logAudit } from "../utils/audit";
import { verifyChain } from "../utils/ledger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const AdminService = {
  async getUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      db.user.findMany({
        skip, take: limit,
        include: { wallet: true },
        orderBy: { createdAt: "desc" },
      }),
      db.user.count(),
    ]);
    return {
      users: users.map((u: any) => ({
        id: u.id, email: u.email, name: u.name, role: u.role,
        kycStatus: u.kycStatus, createdAt: u.createdAt,
        wallet: u.wallet ? { id: u.wallet.id, alias: u.wallet.alias, cvu: u.wallet.cvu, balance: Number(u.wallet.balance), status: u.wallet.status } : null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getUserById(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { wallet: true, auditLogs: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!user) throw new Error("Usuario no encontrado");
    return user;
  },

  async getWallets(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [wallets, total] = await Promise.all([
      db.wallet.findMany({
        skip, take: limit,
        include: { user: { select: { name: true, email: true, kycStatus: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.wallet.count(),
    ]);
    return {
      wallets: wallets.map((w: any) => ({
        id: w.id, alias: w.alias, cvu: w.cvu, balance: Number(w.balance), status: w.status, createdAt: w.createdAt,
        user: w.user,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async blockWallet(adminUserId: string, walletId: string) {
    const wallet = await db.wallet.findUnique({ where: { id: walletId }, include: { user: true } });
    if (!wallet) throw new Error("Wallet no encontrada");

    await db.$transaction(async (tx: any) => {
      await tx.wallet.update({ where: { id: walletId }, data: { status: "BLOCKED" } });
      await tx.notification.create({
        data: {
          userId: wallet.userId,
          title: "🚫 Cuenta bloqueada",
          message: "Tu cuenta fue bloqueada por el administrador. Contactá soporte para más información.",
          type: "WALLET_BLOCKED",
        },
      });
    });

    await logAudit(adminUserId, "ADMIN_BLOCK_WALLET", { walletId, userId: wallet.userId });
    return { message: "Wallet bloqueada" };
  },

  async unblockWallet(adminUserId: string, walletId: string) {
    const wallet = await db.wallet.findUnique({ where: { id: walletId }, include: { user: true } });
    if (!wallet) throw new Error("Wallet no encontrada");

    await db.$transaction(async (tx: any) => {
      await tx.wallet.update({ where: { id: walletId }, data: { status: "ACTIVE" } });
      await tx.notification.create({
        data: {
          userId: wallet.userId,
          title: "✅ Cuenta desbloqueada",
          message: "Tu cuenta fue desbloqueada y ya podés operar normalmente.",
          type: "WALLET_UNBLOCKED",
        },
      });
    });

    await logAudit(adminUserId, "ADMIN_UNBLOCK_WALLET", { walletId, userId: wallet.userId });
    return { message: "Wallet desbloqueada" };
  },

  async getTransactions(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where, skip, take: limit,
        include: {
          senderWallet: { include: { user: { select: { name: true, email: true } } } },
          receiverWallet: { include: { user: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.transaction.count({ where }),
    ]);
    return {
      transactions: transactions.map((tx: any) => ({
        id: tx.id, amount: Number(tx.amount), concept: tx.concept, status: tx.status,
        type: tx.type, failureReason: tx.failureReason, createdAt: tx.createdAt,
        sender: { name: tx.senderWallet.user.name, email: tx.senderWallet.user.email, alias: tx.senderWallet.alias },
        receiver: { name: tx.receiverWallet.user.name, email: tx.receiverWallet.user.email, alias: tx.receiverWallet.alias },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getAuditLogs(page = 1, limit = 50, action?: string) {
    const skip = (page - 1) * limit;
    const where = action ? { action } : {};
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where, skip, take: limit,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.auditLog.count({ where }),
    ]);
    return { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getPendingKyc() {
    const users = await db.user.findMany({
      where: { kycStatus: "PENDING" },
      include: { wallet: true },
      orderBy: { createdAt: "asc" },
    });
    return users;
  },

  async approveKyc(adminUserId: string, userId: string) {
    const user = await db.user.findUnique({ where: { id: userId }, include: { wallet: true } });
    if (!user) throw new Error("Usuario no encontrado");

    await db.$transaction(async (tx: any) => {
      await tx.user.update({ where: { id: userId }, data: { kycStatus: "APPROVED" } });
      if (user.wallet) {
        await tx.wallet.update({ where: { id: user.wallet.id }, data: { status: "ACTIVE" } });
      }
      await tx.notification.create({
        data: {
          userId,
          title: "✅ KYC Aprobado",
          message: "Tu identidad fue verificada por el administrador. Tu cuenta ya está activa.",
          type: "KYC_APPROVED",
        },
      });
    });

    await logAudit(adminUserId, "ADMIN_APPROVE_KYC", { userId });
    return { message: "KYC aprobado" };
  },

  async rejectKyc(adminUserId: string, userId: string, reason?: string) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Usuario no encontrado");

    await db.$transaction(async (tx: any) => {
      await tx.user.update({ where: { id: userId }, data: { kycStatus: "REJECTED" } });
      await tx.notification.create({
        data: {
          userId,
          title: "❌ KYC Rechazado",
          message: reason || "Tu verificación de identidad fue rechazada. Contactá soporte.",
          type: "KYC_REJECTED",
        },
      });
    });

    await logAudit(adminUserId, "ADMIN_REJECT_KYC", { userId, reason });
    return { message: "KYC rechazado" };
  },

  async verifyLedger(adminUserId: string) {
    const result = await verifyChain();
    await logAudit(adminUserId, "ADMIN_VERIFY_LEDGER", result);
    return result;
  },
};
