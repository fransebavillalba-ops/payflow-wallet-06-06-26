// Servicio de notificaciones internas
import prisma from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function createNotification(
  tx: any,
  userId: string,
  title: string,
  message: string,
  type: string
): Promise<void> {
  try {
    await (tx || db).notification.create({
      data: { userId, title, message, type },
    });
  } catch (err) {
    console.error("[Notification] Error al crear:", err);
  }
}
