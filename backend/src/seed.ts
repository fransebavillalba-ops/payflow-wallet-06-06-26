// Seed v3 — usa stableStringify para que el ledger sea consistente
import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "./utils/prisma";

// ── Serialización estable (igual que ledger.ts) ───────────────────────────────
function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj === "object" && !Array.isArray(obj) && typeof (obj as any).toFixed === "function") {
    return JSON.stringify(Number((obj as any).toString()));
  }
  if (obj instanceof Date) return JSON.stringify(obj.toISOString());
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  if (typeof obj === "object") {
    const sorted = Object.keys(obj as object)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + stableStringify((obj as Record<string, unknown>)[key]))
      .join(",");
    return "{" + sorted + "}";
  }
  return JSON.stringify(obj);
}

function computeHash(blockNumber: number, transactionId: string, payload: object, previousHash: string): string {
  const raw = String(blockNumber) + transactionId + stableStringify(payload) + previousHash;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

async function main() {
  console.log("🌱 Iniciando seed de PayFlow v3...");

  // Limpiar en orden correcto por FK
  await prisma.portfolioHolding.deleteMany();
  await prisma.marketOperation.deleteMany();
  await prisma.paymentRequest.deleteMany();
  await prisma.ledgerBlock.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.marketAsset.deleteMany();

  // ── ACTIVOS DE MERCADO ──────────────────────────────────────────────────────
  const now = new Date();
  const makePriceHistory = (base: number) =>
    Array.from({ length: 30 }, (_, i) => ({
      date: new Date(now.getTime() - (29 - i) * 86400000).toISOString().split("T")[0],
      price: parseFloat((base * (1 + (Math.random() - 0.5) * 0.1)).toFixed(2)),
    }));

  await Promise.all([
    prisma.marketAsset.create({ data: { symbol: "BTC", name: "Bitcoin", category: "CRYPTO", currentPrice: 98500, priceHistory: makePriceHistory(95000) } }),
    prisma.marketAsset.create({ data: { symbol: "ETH", name: "Ethereum", category: "CRYPTO", currentPrice: 3200, priceHistory: makePriceHistory(3000) } }),
    prisma.marketAsset.create({ data: { symbol: "SPY", name: "S&P 500 ETF (Simulado)", category: "ETF_INDEX", currentPrice: 580, priceHistory: makePriceHistory(550) } }),
    prisma.marketAsset.create({ data: { symbol: "CEDEAR.AAPL", name: "Apple Inc. CEDEAR", category: "ETF_INDEX", currentPrice: 12400, priceHistory: makePriceHistory(12000) } }),
    prisma.marketAsset.create({ data: { symbol: "ORO", name: "Oro (por gramo)", category: "COMMODITY", currentPrice: 9800, priceHistory: makePriceHistory(9500) } }),
  ]);
  console.log("✅ Activos de mercado creados");

  // ── ADMIN ───────────────────────────────────────────────────────────────────
  const adminPwd = await bcrypt.hash("Admin1234!", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@payflow.local",
      password: adminPwd,
      role: "ADMIN",
      kycStatus: "APPROVED",
      firstName: "Admin",
      lastName: "Sistema",
      wallet: {
        create: { alias: "admin.payflow.9999", cvu: "0000003000000000000001", balance: 999999, status: "ACTIVE" },
      },
    },
    include: { wallet: true },
  });

  // ── USUARIO 1 ───────────────────────────────────────────────────────────────
  const user1Pwd = await bcrypt.hash("User1234!", 12);
  const user1 = await prisma.user.create({
    data: {
      name: "Juan Pérez",
      email: "user1@payflow.local",
      password: user1Pwd,
      role: "USER",
      kycStatus: "APPROVED",
      firstName: "Juan",
      lastName: "Pérez",
      dni: "30123456",
      birthDate: new Date("1992-05-15"),
      gender: "M",
      wallet: {
        create: { alias: "juan.perez.1234", cvu: "0000003000000000000002", balance: 85000, status: "ACTIVE" },
      },
    },
    include: { wallet: true },
  });

  // ── USUARIO 2 ───────────────────────────────────────────────────────────────
  const user2Pwd = await bcrypt.hash("User1234!", 12);
  const user2 = await prisma.user.create({
    data: {
      name: "María González",
      email: "user2@payflow.local",
      password: user2Pwd,
      role: "USER",
      kycStatus: "APPROVED",
      firstName: "María",
      lastName: "González",
      dni: "27654321",
      birthDate: new Date("1995-11-20"),
      gender: "F",
      wallet: {
        create: { alias: "maria.gonzalez.5678", cvu: "0000003000000000000003", balance: 42000, status: "ACTIVE" },
      },
    },
    include: { wallet: true },
  });
  console.log("✅ Usuarios creados");

  // ── TRANSACCIONES + LEDGER ──────────────────────────────────────────────────
  // IMPORTANT: el payload se construye con strings normalizados
  // para que stableStringify produzca siempre el mismo resultado.
  type TxSeed = {
    amount: number; concept: string; status: "SUCCESS" | "FAILED";
    senderWalletId: string; receiverWalletId: string; type: "TRANSFER" | "DEPOSIT" | "WITHDRAWAL";
    failureReason?: string;
  };

  const txData: TxSeed[] = [
    { amount: 5000,   concept: "Pago de alquiler",              status: "SUCCESS", senderWalletId: user1.wallet!.id, receiverWalletId: user2.wallet!.id, type: "TRANSFER" },
    { amount: 1500,   concept: "División de cena",              status: "SUCCESS", senderWalletId: user2.wallet!.id, receiverWalletId: user1.wallet!.id, type: "TRANSFER" },
    { amount: 999999, concept: "Prueba saldo insuficiente",     status: "FAILED",  senderWalletId: user1.wallet!.id, receiverWalletId: user2.wallet!.id, type: "TRANSFER", failureReason: "INSUFFICIENT_FUNDS" },
    { amount: 2000,   concept: "Pago de servicios",             status: "SUCCESS", senderWalletId: user1.wallet!.id, receiverWalletId: user2.wallet!.id, type: "TRANSFER" },
    { amount: 10000,  concept: "Carga de saldo inicial",        status: "SUCCESS", senderWalletId: user1.wallet!.id, receiverWalletId: user1.wallet!.id, type: "DEPOSIT" },
  ];

  let blockNumber = 1;
  let previousHash = "0";

  for (let i = 0; i < txData.length; i++) {
    const d = txData[i];
    const tx = await prisma.transaction.create({
      data: {
        amount:          d.amount,
        concept:         d.concept,
        status:          d.status,
        type:            d.type,
        failureReason:   d.failureReason ?? null,
        idempotencyKey:  `seed-tx-${String(i + 1).padStart(3, "0")}`,
        senderWalletId:  d.senderWalletId,
        receiverWalletId: d.receiverWalletId,
      },
    });

    if (d.status === "SUCCESS") {
      // Payload 100% con strings normalizados para que stableStringify sea estable
      const payload: Record<string, string> = {
        amount:          String(d.amount),
        concept:         d.concept,
        senderWalletId:  d.senderWalletId,
        receiverWalletId: d.receiverWalletId,
        status:          "SUCCESS",
        createdAt:       tx.createdAt.toISOString(),
      };

      const currentHash = computeHash(blockNumber, tx.id, payload, previousHash);
      await prisma.ledgerBlock.create({
        data: { transactionId: tx.id, previousHash, currentHash, payload, algorithm: "SHA-256" },
      });
      previousHash = currentHash;
      blockNumber++;
    }
  }
  console.log("✅ Transacciones y LedgerBlocks creados");

  // ── AUDIT LOGS ──────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: "REGISTER",     metadata: { email: admin.email } },
      { userId: user1.id, action: "REGISTER",     metadata: { email: user1.email } },
      { userId: user1.id, action: "KYC_APPROVED", metadata: { dni: "30123456" } },
      { userId: user2.id, action: "REGISTER",     metadata: { email: user2.email } },
      { userId: user2.id, action: "KYC_APPROVED", metadata: { dni: "27654321" } },
    ],
  });

  // ── CONTACTOS ───────────────────────────────────────────────────────────────
  await prisma.contact.create({ data: { userId: user1.id, alias: "maria.gonzalez.5678", label: "María" } });
  await prisma.contact.create({ data: { userId: user2.id, alias: "juan.perez.1234",    label: "Juan" } });

  // ── NOTIFICACIONES ──────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: user1.id, title: "Identidad verificada",   message: "Tu cuenta está activa y lista para operar.", type: "KYC_APPROVED",      read: true },
      { userId: user1.id, title: "Transferencia recibida", message: "Recibiste $1.500 de María González.",        type: "TRANSFER_RECEIVED", read: false },
      { userId: user2.id, title: "Identidad verificada",   message: "Tu cuenta está activa y lista para operar.", type: "KYC_APPROVED",      read: true },
      { userId: user2.id, title: "Transferencia recibida", message: "Recibiste $5.000 de Juan Pérez.",            type: "TRANSFER_RECEIVED", read: false },
    ],
  });
  console.log("✅ Contactos y notificaciones creados");

  console.log(`
╔══════════════════════════════════════════════════╗
║           Seed completado correctamente           ║
║                                                  ║
║  Credenciales en: backend/.env.example           ║
║  o en: CREDENCIALES_DEMO.md                      ║
╚══════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => { console.error("❌ Error en seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
