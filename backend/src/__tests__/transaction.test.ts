// Tests de transferencias

import { TransactionService } from "../services/transaction.service";
import { Decimal } from "@prisma/client/runtime/library";

jest.mock("../utils/prisma", () => ({
  __esModule: true,
  default: {
    wallet: { findUnique: jest.fn() },
    transaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));
jest.mock("../utils/audit", () => ({ logAudit: jest.fn() }));

import prisma from "../utils/prisma";

const mockSenderWallet = { id: "w1", userId: "u1", balance: new Decimal(1000), alias: "sender.1234" };
const mockReceiverWallet = { id: "w2", userId: "u2", balance: new Decimal(500), alias: "receiver.5678" };

describe("TransactionService.transfer", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rechaza monto 0", async () => {
    await expect(
      TransactionService.transfer("u1", {
        receiverAlias: "receiver.5678", amount: 0, concept: "test",
        idempotencyKey: "00000000-0000-0000-0000-000000000001",
      })
    ).rejects.toThrow();
  });

  it("rechaza transferencia a uno mismo", async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.wallet.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockSenderWallet)
      .mockResolvedValueOnce(mockSenderWallet); // mismo wallet

    await expect(
      TransactionService.transfer("u1", {
        receiverAlias: "sender.1234", amount: 100, concept: "test",
        idempotencyKey: "00000000-0000-0000-0000-000000000002",
      })
    ).rejects.toThrow("No podés transferirte a vos mismo");
  });

  it("retorna transacción existente si idempotencyKey ya fue usada", async () => {
    const existingTx = { id: "tx1", status: "SUCCESS" };
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(existingTx);

    const result = await TransactionService.transfer("u1", {
      receiverAlias: "receiver.5678", amount: 100, concept: "test",
      idempotencyKey: "00000000-0000-0000-0000-000000000003",
    });

    expect(result).toEqual(existingTx);
  });

  it("ejecuta transferencia exitosa", async () => {
    (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.wallet.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockSenderWallet)
      .mockResolvedValueOnce(mockReceiverWallet);

    const successTx = { id: "tx2", status: "SUCCESS", amount: new Decimal(100) };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      return fn({
        wallet: { findUnique: jest.fn().mockResolvedValue(mockSenderWallet), update: jest.fn() },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: "tx2", status: "PROCESSING" }),
          update: jest.fn().mockResolvedValue(successTx),
        },
      });
    });

    const result = await TransactionService.transfer("u1", {
      receiverAlias: "receiver.5678", amount: 100, concept: "pago test",
      idempotencyKey: "00000000-0000-0000-0000-000000000004",
    });

    expect(result.status).toBe("SUCCESS");
  });
});
