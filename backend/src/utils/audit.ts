// Utilidad de auditoría

import prisma from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function logAudit(
  userId: string,
  action: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await db.auditLog.create({ data: { userId, action, metadata } });
  } catch (err) {
    console.error("[AuditLog] Error al registrar:", err);
  }
}
