// Servicio de Mercado Simulado
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../utils/prisma";
import { validate, MarketTradeSchema } from "../utils/validate";
import { createLedgerBlock } from "../utils/ledger";
import { logAudit } from "../utils/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const MarketService = {
  async getAssets() {
    return db.marketAsset.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" },
    });
  },

  async getAsset(id: string) {
    const asset = await db.marketAsset.findUnique({ where: { id } });
    if (!asset) throw new Error("Activo no encontrado");
    return asset;
  },

  async trade(userId: string, data: unknown) {
    const { assetId, operationType, quantity } = validate(MarketTradeSchema, data);

    const wallet = await db.wallet.findUnique({ where: { userId }, include: { user: true } });
    if (!wallet) throw new Error("Wallet no encontrada");
    if (wallet.status !== "ACTIVE") throw new Error("Tu wallet no está activa para operar");

    const asset = await db.marketAsset.findUnique({ where: { id: assetId } });
    if (!asset || !asset.isActive) throw new Error("Activo no disponible");

    const priceAtOp = new Decimal(asset.currentPrice);
    const qty = new Decimal(quantity);
    const totalAmount = priceAtOp.mul(qty);
    const txType = operationType === "BUY" ? "MARKET_BUY" : "MARKET_SELL";

    const result = await db.$transaction(async (t: any) => {
      const fresh = await t.wallet.findUnique({ where: { id: wallet.id } });
      const balBefore = new Decimal(fresh.balance);

      if (operationType === "BUY") {
        if (balBefore.lessThan(totalAmount)) throw new Error("Saldo insuficiente para esta operación");
        await t.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: totalAmount } } });
      } else {
        // SELL: check portfolio
        const holding = await t.portfolioHolding.findUnique({
          where: { walletId_assetId: { walletId: wallet.id, assetId } },
        });
        if (!holding || new Decimal(holding.quantity).lessThan(qty)) throw new Error("No tenés suficiente cantidad del activo para vender");
        await t.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: totalAmount } } });
      }

      const idempotencyKey = `market-${operationType}-${userId}-${assetId}-${Date.now()}`;
      const concept = `${operationType === "BUY" ? "Compra" : "Venta"} de ${quantity} ${asset.symbol} a $${Number(priceAtOp).toFixed(2)}`;

      const newTx = await t.transaction.create({
        data: {
          amount: totalAmount,
          concept,
          status: "SUCCESS",
          type: txType,
          idempotencyKey,
          senderWalletId: wallet.id,
          receiverWalletId: wallet.id,
        },
      });

      const freshUpdated = await t.wallet.findUnique({ where: { id: wallet.id } });
      const balAfter = new Decimal(freshUpdated.balance);

      await t.ledgerEntry.create({
        data: {
          transactionId: newTx.id,
          walletId: wallet.id,
          direction: operationType === "BUY" ? "DEBIT" : "CREDIT",
          amount: totalAmount,
          balanceBefore: balBefore,
          balanceAfter: balAfter,
        },
      });

      const payload = {
        amount: totalAmount.toString(),
        concept,
        walletId: wallet.id,
        assetId,
        operationType,
        quantity: qty.toString(),
        priceAtOperation: priceAtOp.toString(),
        status: "SUCCESS",
        createdAt: newTx.createdAt.toISOString(),
      };
      await createLedgerBlock(t, newTx.id, payload);

      await t.marketOperation.create({
        data: {
          transactionId: newTx.id,
          walletId: wallet.id,
          assetId,
          operationType,
          quantity: qty,
          priceAtOperation: priceAtOp,
          totalAmount,
        },
      });

      // Update portfolio
      if (operationType === "BUY") {
        const existing = await t.portfolioHolding.findUnique({
          where: { walletId_assetId: { walletId: wallet.id, assetId } },
        });
        if (existing) {
          const newQty = new Decimal(existing.quantity).add(qty);
          const newAvg = new Decimal(existing.avgPrice).mul(existing.quantity).add(totalAmount).div(newQty);
          await t.portfolioHolding.update({
            where: { walletId_assetId: { walletId: wallet.id, assetId } },
            data: { quantity: newQty, avgPrice: newAvg },
          });
        } else {
          await t.portfolioHolding.create({
            data: { walletId: wallet.id, assetId, quantity: qty, avgPrice: priceAtOp },
          });
        }
      } else {
        const existing = await t.portfolioHolding.findUnique({
          where: { walletId_assetId: { walletId: wallet.id, assetId } },
        });
        if (existing) {
          const newQty = new Decimal(existing.quantity).sub(qty);
          if (newQty.lte(0)) {
            await t.portfolioHolding.delete({ where: { walletId_assetId: { walletId: wallet.id, assetId } } });
          } else {
            await t.portfolioHolding.update({
              where: { walletId_assetId: { walletId: wallet.id, assetId } },
              data: { quantity: newQty },
            });
          }
        }
      }

      await t.notification.create({
        data: {
          userId,
          title: operationType === "BUY" ? "📈 Compra realizada" : "📉 Venta realizada",
          message: `${concept}. Total: $${Number(totalAmount).toLocaleString("es-AR")}. ⚠️ Operación ficticia.`,
          type: "MARKET_OPERATION",
        },
      });

      return newTx;
    });

    await logAudit(userId, "MARKET_OPERATION", { assetId, operationType, quantity, totalAmount: Number(totalAmount) });
    return result;
  },

  async getPortfolio(userId: string) {
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet no encontrada");

    const holdings = await db.portfolioHolding.findMany({
      where: { walletId: wallet.id },
      include: { asset: true },
    });

    return holdings.map((h: any) => ({
      assetId: h.assetId,
      symbol: h.asset.symbol,
      name: h.asset.name,
      category: h.asset.category,
      quantity: Number(h.quantity),
      avgPrice: Number(h.avgPrice),
      currentPrice: Number(h.asset.currentPrice),
      currentValue: Number(new Decimal(h.quantity).mul(h.asset.currentPrice)),
      pnl: Number(new Decimal(h.quantity).mul(h.asset.currentPrice).sub(new Decimal(h.quantity).mul(h.avgPrice))),
    }));
  },

  // Admin actions
  async createAsset(data: any) {
    return db.marketAsset.create({ data });
  },

  async updateAsset(id: string, data: any) {
    return db.marketAsset.update({ where: { id }, data });
  },
};
