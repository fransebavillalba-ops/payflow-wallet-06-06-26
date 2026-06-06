// Servicio de notificaciones
import prisma from "../utils/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const NotificationService = {
  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.notification.count({ where: { userId } }),
      db.notification.count({ where: { userId, read: false } }),
    ]);
    return { notifications, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, unreadCount };
  },

  async markAsRead(userId: string, notificationId: string) {
    const notif = await db.notification.findUnique({ where: { id: notificationId } });
    if (!notif || notif.userId !== userId) throw new Error("Notificación no encontrada");
    return db.notification.update({ where: { id: notificationId }, data: { read: true } });
  },

  async markAllAsRead(userId: string) {
    return db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  },
};
