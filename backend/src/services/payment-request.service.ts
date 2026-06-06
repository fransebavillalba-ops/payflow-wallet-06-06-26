// Servicio de solicitudes de pago
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../utils/prisma";
import { validate, PaymentRequestSchema } from "../utils/validate";
import { createLedgerBlock } from "../utils/ledger";
import { logAudit } from "../utils/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const PaymentRequestService = {
  async create(requesterUserId: string, data: unknown) {
    const { payerAlias, amount, concept } = validate(PaymentRequestSchema, data);

    const requesterWallet = await db.wallet.findUnique({ where: { userId: requesterUserId }, include: { user: true } });
    if (!requesterWallet) throw new Error("Wallet no encontrada");
    if (requesterWallet.status !== "ACTIVE") throw new Error("Tu wallet no está activa");

    const payerWallet = await db.wallet.findUnique({ where: { alias: payerAlias }, include: { user: true } });
    if (!payerWallet) throw new Error(`No existe wallet con alias "${payerAlias}"`);
    if (payerWallet.id === requesterWallet.id) throw new Error("No podés solicitarte dinero a vos mismo");

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h

    const request = await db.$transaction(async (tx: any) => {
      const req = await tx.paymentRequest.create({
        data: {
          requesterWalletId: requesterWallet.id,
          payerWalletId: payerWallet.id,
          amount: new Decimal(amount),
          concept,
          expiresAt,
        },
      });

      await tx.notification.create({
        data: {
          userId: payerWallet.user.id,
          title: "🔔 Solicitud de dinero",
          message: `${requesterWallet.user.name} te solicita $${amount.toLocaleString("es-AR")}. Concepto: ${concept}`,
          type: "PAYMENT_REQUEST",
        },
      });

      return req;
    });

    return request;
  },

  async listReceived(userId: string) {
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet no encontrada");

    return db.paymentRequest.findMany({
      where: { payerWalletId: wallet.id },
      include: {
        requesterWallet: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async listSent(userId: string) {
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet no encontrada");

    return db.paymentRequest.findMany({
      where: { requesterWalletId: wallet.id },
      include: {
        payerWallet: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async accept(payerUserId: string, requestId: string) {
    const payerWallet = await db.wallet.findUnique({ where: { userId: payerUserId }, include: { user: true } });
    if (!payerWallet) throw new Error("Wallet no encontrada");
    if (payerWallet.status !== "ACTIVE") throw new Error("Tu wallet no está activa");

    const request = await db.paymentRequest.findUnique({
      where: { id: requestId },
      include: { requesterWallet: { include: { user: true } } },
    });
    if (!request) throw new Error("Solicitud no encontrada");
    if (request.payerWalletId !== payerWallet.id) {
      const err = new Error("Sin acceso a esta solicitud");
      (err as any).statusCode = 403;
      throw err;
    }
    if (request.status !== "PENDING") throw new Error("La solicitud ya fue procesada");
    if (request.expiresAt < new Date()) throw new Error("La solicitud expiró");

    const amount = new Decimal(request.amount);
    const idempotencyKey = `pr-accept-${requestId}`;

    const tx = await db.$transaction(async (t: any) => {
      const fresh = await t.wallet.findUnique({ where: { id: payerWallet.id } });
      if (new Decimal(fresh.balance).lessThan(amount)) throw new Error("Saldo insuficiente");

      const senderBefore = new Decimal(fresh.balance);
      await t.wallet.update({ where: { id: payerWallet.id }, data: { balance: { decrement: amount } } });

      const freshReceiver = await t.wallet.findUnique({ where: { id: request.requesterWalletId } });
      const receiverBefore = new Decimal(freshReceiver.balance);
      await t.wallet.update({ where: { id: request.requesterWalletId }, data: { balance: { increment: amount } } });

      const newTx = await t.transaction.create({
        data: {
          amount,
          concept: request.concept,
          status: "SUCCESS",
          type: "TRANSFER",
          idempotencyKey,
          senderWalletId: payerWallet.id,
          receiverWalletId: request.requesterWalletId,
        },
      });

      await t.ledgerEntry.createMany({
        data: [
          { transactionId: newTx.id, walletId: payerWallet.id, direction: "DEBIT", amount, balanceBefore: senderBefore, balanceAfter: senderBefore.sub(amount) },
          { transactionId: newTx.id, walletId: request.requesterWalletId, direction: "CREDIT", amount, balanceBefore: receiverBefore, balanceAfter: receiverBefore.add(amount) },
        ],
      });

      const payload = {
        amount: amount.toString(),
        concept: request.concept,
        senderWalletId: payerWallet.id,
        receiverWalletId: request.requesterWalletId,
        status: "SUCCESS",
        createdAt: newTx.createdAt.toISOString(),
      };
      await createLedgerBlock(t, newTx.id, payload);

      await t.paymentRequest.update({ where: { id: requestId }, data: { status: "ACCEPTED" } });

      await t.notification.create({
        data: {
          userId: request.requesterWallet.user.id,
          title: "✅ Solicitud aceptada",
          message: `${payerWallet.user.name} aceptó tu solicitud y te envió $${Number(amount).toLocaleString("es-AR")}.`,
          type: "PAYMENT_REQUEST_ACCEPTED",
        },
      });

      return newTx;
    });

    await logAudit(payerUserId, "PAYMENT_REQUEST_ACCEPTED", { requestId, amount: Number(amount) });
    return tx;
  },

  async reject(payerUserId: string, requestId: string) {
    const payerWallet = await db.wallet.findUnique({ where: { userId: payerUserId } });
    if (!payerWallet) throw new Error("Wallet no encontrada");

    const request = await db.paymentRequest.findUnique({
      where: { id: requestId },
      include: { requesterWallet: { include: { user: true } } },
    });
    if (!request) throw new Error("Solicitud no encontrada");
    if (request.payerWalletId !== payerWallet.id) {
      const err = new Error("Sin acceso"); (err as any).statusCode = 403; throw err;
    }
    if (request.status !== "PENDING") throw new Error("La solicitud ya fue procesada");

    await db.$transaction(async (t: any) => {
      await t.paymentRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } });
      await t.notification.create({
        data: {
          userId: request.requesterWallet.user.id,
          title: "❌ Solicitud rechazada",
          message: `Tu solicitud de $${Number(request.amount).toLocaleString("es-AR")} fue rechazada.`,
          type: "PAYMENT_REQUEST_REJECTED",
        },
      });
    });

    return { message: "Solicitud rechazada" };
  },
};
