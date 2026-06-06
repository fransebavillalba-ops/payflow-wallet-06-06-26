// LedgerChain — SHA-256 con serialización estable de payload
// El problema clásico: JSON.stringify no garantiza orden de claves.
// PostgreSQL/Prisma puede devolver objetos con distinto orden.
// Solución: ordenar recursivamente todas las claves antes de serializar.

import crypto from "crypto";
import prisma from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

/**
 * Serialización determinista: ordena recursivamente todas las claves.
 * Normaliza Decimal, Date y otros tipos especiales a strings/números.
 */
export function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return "null";

  // Decimal de Prisma o cualquier objeto con toFixed
  if (typeof obj === "object" && !Array.isArray(obj) && typeof (obj as any).toFixed === "function") {
    return JSON.stringify(Number((obj as any).toString()));
  }

  // Fechas: serializar como ISO string
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }

  // Arrays: procesar cada elemento en orden
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }

  // Objetos: ordenar claves alfabéticamente y recursar
  if (typeof obj === "object") {
    const sorted = Object.keys(obj as object)
      .sort()
      .map((key) => {
        const val = stableStringify((obj as Record<string, unknown>)[key]);
        return JSON.stringify(key) + ":" + val;
      })
      .join(",");
    return "{" + sorted + "}";
  }

  // Primitivos: string, number, boolean
  return JSON.stringify(obj);
}

/**
 * Calcula el hash SHA-256 de un bloque de forma siempre consistente.
 * Usa stableStringify en el payload para evitar diferencias de orden de claves.
 */
export function computeHash(
  blockNumber: number,
  transactionId: string,
  payload: Record<string, unknown>,
  previousHash: string
): string {
  const raw =
    String(blockNumber) +
    transactionId +
    stableStringify(payload) +
    previousHash;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Crea un LedgerBlock dentro de una transacción Prisma activa.
 * El payload debe pasarse ya normalizado (strings, no Decimal ni Date).
 */
export async function createLedgerBlock(
  tx: any,
  transactionId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const lastBlock = await tx.ledgerBlock.findFirst({
    orderBy: { blockNumber: "desc" },
  });

  const previousHash = lastBlock ? lastBlock.currentHash : "0";
  const nextBlockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;

  const currentHash = computeHash(nextBlockNumber, transactionId, payload, previousHash);

  await tx.ledgerBlock.create({
    data: {
      transactionId,
      previousHash,
      currentHash,
      payload,
      algorithm: "SHA-256",
    },
  });
}

/**
 * Verifica la integridad de toda la cadena de LedgerBlocks.
 * Recalcula cada hash con stableStringify y lo compara con el almacenado.
 */
export async function verifyChain(): Promise<{
  valid: boolean;
  brokenAt?: number;
  totalBlocks: number;
  message: string;
}> {
  const blocks = await db.ledgerBlock.findMany({
    orderBy: { blockNumber: "asc" },
  });

  if (blocks.length === 0) {
    return { valid: true, totalBlocks: 0, message: "No hay bloques en el ledger aún." };
  }

  let previousHash = "0";

  for (const block of blocks) {
    const expected = computeHash(
      block.blockNumber,
      block.transactionId,
      block.payload as Record<string, unknown>,
      previousHash
    );

    if (expected !== block.currentHash) {
      return {
        valid: false,
        brokenAt: block.blockNumber,
        totalBlocks: blocks.length,
        message: `Integridad comprometida en el bloque #${block.blockNumber}.`,
      };
    }
    previousHash = block.currentHash;
  }

  return {
    valid: true,
    totalBlocks: blocks.length,
    message: `Ledger verificado correctamente. ${blocks.length} bloque${blocks.length !== 1 ? "s" : ""} íntegro${blocks.length !== 1 ? "s" : ""}.`,
  };
}
