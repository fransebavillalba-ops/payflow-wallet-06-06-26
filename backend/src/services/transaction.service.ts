// Servicio de Transacciones v3 — Ledger formal, LedgerBlock, Notifications

import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../utils/prisma";
import { logAudit } from "../utils/audit";
import { validate, TransferSchema, FundSchema } from "../utils/validate";
import { createLedgerBlock } from "../utils/ledger";
import { TransferDTO, FundDTO } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const TransactionService = {
  async transfer(senderUserId: string, dto: TransferDTO) {
    const { receiverAlias, amount, concept, idempotencyKey } = validate(TransferSchema, {
      ...dto,
      amount: Number(dto.amount),
    });

    const existing = await db.transaction.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const senderWallet = await db.wallet.findUnique({
      where: { userId: senderUserId },
      include: { user: true },
    });
    if (!senderWallet) throw new Error("Tu wallet no fue encontrada");
    if (senderWallet.status !== "ACTIVE") throw new Error("Tu wallet no está activa para operar");

    const receiverWallet = await db.wallet.findUnique({
      where: { alias: receiverAlias },
      include: { user: true },
    });
    if (!receiverWallet) throw new Error(`No se encontró ninguna wallet con alias "${receiverAlias}"`);
    if (receiverWallet.status !== "ACTIVE") throw new Error("La wallet destino no está activa");

    if (senderWallet.id === receiverWallet.id) throw new Error("No podés transferirte a vos mismo");

    const amountDecimal = new Decimal(amount);

    const transaction = await db.$transaction(async (tx: any) => {
      const freshSender = await tx.wallet.findUnique({ where: { id: senderWallet.id } });
      if (!freshSender) throw new Error("Wallet emisora no encontrada");

      if (new Decimal(freshSender.balance).lessThan(amountDecimal)) {
        const failedTx = await tx.transaction.create({
          data: {
            amount: amountDecimal,
            concept,
            status: "FAILED",
            failureReason: "INSUFFICIENT_FUNDS",
            idempotencyKey,
            senderWalletId: senderWallet.id,
            receiverWalletId: receiverWallet.id,
          },
        });
        return failedTx;
      }

      const processingTx = await tx.transaction.create({
        data: {
          amount: amountDecimal,
          concept,
          status: "PROCESSING",
          idempotencyKey,
          senderWalletId: senderWallet.id,
          receiverWalletId: receiverWallet.id,
        },
      });

      const senderBefore = new Decimal(freshSender.balance);
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amountDecimal } },
      });

      const freshReceiver = await tx.wallet.findUnique({ where: { id: receiverWallet.id } });
      const receiverBefore = new Decimal(freshReceiver.balance);
      await tx.wallet.update({
        where: { id: receiverWallet.id },
        data: { balance: { increment: amountDecimal } },
      });

      const successTx = await tx.transaction.update({
        where: { id: processingTx.id },
        data: { status: "SUCCESS" },
      });

      // Ledger entries
      await tx.ledgerEntry.create({
        data: {
          transactionId: successTx.id,
          walletId: senderWallet.id,
          direction: "DEBIT",
          amount: amountDecimal,
          balanceBefore: senderBefore,
          balanceAfter: senderBefore.sub(amountDecimal),
        },
      });
      await tx.ledgerEntry.create({
        data: {
          transactionId: successTx.id,
          walletId: receiverWallet.id,
          direction: "CREDIT",
          amount: amountDecimal,
          balanceBefore: receiverBefore,
          balanceAfter: receiverBefore.add(amountDecimal),
        },
      });

      // LedgerBlock
      const payload = {
        amount: amountDecimal.toString(),
        concept,
        senderWalletId: senderWallet.id,
        receiverWalletId: receiverWallet.id,
        status: "SUCCESS",
        createdAt: successTx.createdAt.toISOString(),
      };
      await createLedgerBlock(tx, successTx.id, payload);

      // Notification to receiver
      await tx.notification.create({
        data: {
          userId: receiverWallet.user.id,
          title: "💸 Transferencia recibida",
          message: `Recibiste $${amount.toLocaleString("es-AR")} de ${senderWallet.user.name} (${senderWallet.alias}). Concepto: ${concept}`,
          type: "TRANSFER_RECEIVED",
        },
      });

      return successTx;
    });

    if (transaction.status === "FAILED") {
      await logAudit(senderUserId, "TRANSFER_FAILED", {
        receiverAlias, amount, concept, reason: "INSUFFICIENT_FUNDS",
      });
      throw new Error("Saldo insuficiente para realizar la transferencia");
    }

    await logAudit(senderUserId, "TRANSFER_SUCCESS", {
      receiverAlias, amount, concept, transactionId: transaction.id,
    });

    return transaction;
  },

  async deposit(userId: string, dto: FundDTO) {
    const { amount, concept } = validate(FundSchema, { ...dto, amount: Number(dto.amount) });
    const wallet = await db.wallet.findUnique({ where: { userId }, include: { user: true } });
    if (!wallet) throw new Error("Wallet no encontrada");
    if (wallet.status !== "ACTIVE") throw new Error("Tu wallet no está activa para operar");

    const amountDecimal = new Decimal(amount);
    const idempotencyKey = `deposit-${userId}-${Date.now()}`;

    const tx = await db.$transaction(async (t: any) => {
      const fresh = await t.wallet.findUnique({ where: { id: wallet.id } });
      const balBefore = new Decimal(fresh.balance);

      await t.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amountDecimal } },
      });

      const newTx = await t.transaction.create({
        data: {
          amount: amountDecimal,
          concept: concept || "Carga de saldo",
          status: "SUCCESS",
          type: "DEPOSIT",
          idempotencyKey,
          senderWalletId: wallet.id,
          receiverWalletId: wallet.id,
        },
      });

      await t.ledgerEntry.create({
        data: {
          transactionId: newTx.id,
          walletId: wallet.id,
          direction: "CREDIT",
          amount: amountDecimal,
          balanceBefore: balBefore,
          balanceAfter: balBefore.add(amountDecimal),
        },
      });

      const payload = {
        amount: amountDecimal.toString(),
        concept: concept || "Carga de saldo",
        walletId: wallet.id,
        status: "SUCCESS",
        createdAt: newTx.createdAt.toISOString(),
      };
      await createLedgerBlock(t, newTx.id, payload);

      await t.notification.create({
        data: {
          userId,
          title: "✅ Saldo acreditado",
          message: `Se acreditaron $${amount.toLocaleString("es-AR")} en tu cuenta PayFlow.`,
          type: "DEPOSIT",
        },
      });

      return newTx;
    });

    await logAudit(userId, "DEPOSIT", { amount, transactionId: tx.id });
    return tx;
  },

  async withdraw(userId: string, dto: FundDTO) {
    const { amount, concept } = validate(FundSchema, { ...dto, amount: Number(dto.amount) });
    const wallet = await db.wallet.findUnique({ where: { userId }, include: { user: true } });
    if (!wallet) throw new Error("Wallet no encontrada");
    if (wallet.status !== "ACTIVE") throw new Error("Tu wallet no está activa para operar");

    const amountDecimal = new Decimal(amount);

    const tx = await db.$transaction(async (t: any) => {
      const fresh = await t.wallet.findUnique({ where: { id: wallet.id } });
      if (!fresh || new Decimal(fresh.balance).lessThan(amountDecimal)) {
        throw new Error("Saldo insuficiente para realizar el retiro");
      }

      const balBefore = new Decimal(fresh.balance);
      await t.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amountDecimal } },
      });

      const newTx = await t.transaction.create({
        data: {
          amount: amountDecimal,
          concept: concept || "Retiro de saldo",
          status: "SUCCESS",
          type: "WITHDRAWAL",
          idempotencyKey: `withdraw-${userId}-${Date.now()}`,
          senderWalletId: wallet.id,
          receiverWalletId: wallet.id,
        },
      });

      await t.ledgerEntry.create({
        data: {
          transactionId: newTx.id,
          walletId: wallet.id,
          direction: "DEBIT",
          amount: amountDecimal,
          balanceBefore: balBefore,
          balanceAfter: balBefore.sub(amountDecimal),
        },
      });

      const payload = {
        amount: amountDecimal.toString(),
        concept: concept || "Retiro de saldo",
        walletId: wallet.id,
        status: "SUCCESS",
        createdAt: newTx.createdAt.toISOString(),
      };
      await createLedgerBlock(t, newTx.id, payload);

      await t.notification.create({
        data: {
          userId,
          title: "📤 Retiro realizado",
          message: `Retiraste $${amount.toLocaleString("es-AR")} de tu cuenta PayFlow.`,
          type: "WITHDRAWAL",
        },
      });

      return newTx;
    });

    await logAudit(userId, "WITHDRAWAL", { amount, transactionId: tx.id });
    return tx;
  },

  async getMyHistory(userId: string, page = 1, limit = 20, dateFrom?: string, dateTo?: string) {
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet no encontrada");

    const skip = (page - 1) * limit;
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo)   dateFilter.lte = new Date(dateTo);

    const where = {
      OR: [{ senderWalletId: wallet.id }, { receiverWalletId: wallet.id }],
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {}),
    };

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          senderWallet: { include: { user: { select: { name: true } } } },
          receiverWallet: { include: { user: { select: { name: true } } } },
          ledgerBlock: { select: { currentHash: true, blockNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.transaction.count({ where }),
    ]);

    const enriched = transactions.map((tx: any) => ({
      id: tx.id,
      amount: Number(tx.amount),
      concept: tx.concept,
      status: tx.status,
      type: tx.type || "TRANSFER",
      failureReason: tx.failureReason,
      direction: tx.senderWalletId === wallet.id ? "SENT" : "RECEIVED",
      senderName: tx.senderWallet.user.name,
      senderAlias: tx.senderWallet.alias,
      receiverName: tx.receiverWallet.user.name,
      receiverAlias: tx.receiverWallet.alias,
      ledgerBlock: tx.ledgerBlock,
      createdAt: tx.createdAt,
    }));

    return { transactions: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async getReceipt(transactionId: string, userId: string) {
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet no encontrada");

    const tx = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        senderWallet: { include: { user: { select: { name: true } } } },
        receiverWallet: { include: { user: { select: { name: true } } } },
        ledgerBlock: true,
      },
    });
    if (!tx) throw new Error("Transacción no encontrada");

    const isOwner = tx.senderWalletId === wallet.id || tx.receiverWalletId === wallet.id;
    if (!isOwner) {
      const err = new Error("Sin acceso a esta transacción");
      (err as any).statusCode = 403;
      throw err;
    }

    return {
      id: tx.id,
      fechaHora: tx.createdAt,
      aliasOrigen: tx.senderWallet.alias,
      aliasDestino: tx.receiverWallet.alias,
      cvuDestino: tx.receiverWallet.cvu,
      monto: Number(tx.amount),
      concepto: tx.concept,
      estado: tx.status,
      tipo: tx.type,
      hash: tx.ledgerBlock?.currentHash || null,
      blockNumber: tx.ledgerBlock?.blockNumber || null,
    };
  },

  async getFailedTransactions(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where: { status: "FAILED" },
        include: {
          senderWallet: { include: { user: { select: { name: true, email: true } } } },
          receiverWallet: { include: { user: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.transaction.count({ where: { status: "FAILED" } }),
    ]);

    return {
      transactions: transactions.map((tx: any) => ({
        id: tx.id,
        amount: Number(tx.amount),
        concept: tx.concept,
        status: tx.status,
        type: tx.type || "TRANSFER",
        failureReason: tx.failureReason,
        sender: { name: tx.senderWallet.user.name, email: tx.senderWallet.user.email, alias: tx.senderWallet.alias },
        receiver: { name: tx.receiverWallet.user.name, email: tx.receiverWallet.user.email, alias: tx.receiverWallet.alias },
        createdAt: tx.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getAdminStats() {
    const [totalUsers, totalWallets, activeWallets, blockedWallets, totalTransactions, failedCount, successCount, pendingKyc] =
      await Promise.all([
        db.user.count(),
        db.wallet.count(),
        db.wallet.count({ where: { status: "ACTIVE" } }),
        db.wallet.count({ where: { status: "BLOCKED" } }),
        db.transaction.count(),
        db.transaction.count({ where: { status: "FAILED" } }),
        db.transaction.count({ where: { status: "SUCCESS" } }),
        db.user.count({ where: { kycStatus: "PENDING" } }),
      ]);

    const volumeResult = await db.transaction.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    });

    const { valid, totalBlocks } = await import("../utils/ledger").then(m => m.verifyChain());

    return {
      totalUsers, totalWallets, activeWallets, blockedWallets,
      totalTransactions, failedCount, successCount,
      totalVolume: Number(volumeResult._sum.amount || 0),
      pendingKyc,
      ledgerStatus: { valid, totalBlocks },
    };
  },
};
