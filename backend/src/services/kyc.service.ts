// Servicio KYC — manejo de verificaciones de identidad
import path from "path";
import fs from "fs";
import prisma from "../utils/prisma";
import { logAudit } from "../utils/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "kyc");

// Asegurar directorio
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function saveBase64Image(base64: string, filename: string): string {
  const matches = base64.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
  if (!matches) throw new Error("Formato de imagen inválido");
  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  if (buffer.length > 5 * 1024 * 1024) throw new Error("La imagen no puede superar los 5 MB");
  const safeName = `${filename}.${ext}`;
  const fullPath = path.join(UPLOAD_DIR, safeName);
  fs.writeFileSync(fullPath, buffer);
  return path.join("uploads", "kyc", safeName);
}

export const KycService = {
  async getMyKyc(userId: string) {
    return db.kycVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async submit(
    userId: string,
    data: {
      documentType?: string;
      documentNumber?: string;
      fullName?: string;
      birthDate?: string;
      frontImage?: string;   // base64
      backImage?: string;    // base64
      selfieImage?: string;  // base64
    }
  ) {
    const existing = await db.kycVerification.findFirst({
      where: { userId, status: "PENDING" },
    });
    if (existing) throw new Error("Ya tenés una verificación pendiente de revisión.");

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Usuario no encontrado");
    if (user.kycStatus === "APPROVED") throw new Error("Tu identidad ya fue verificada.");

    let frontImagePath: string | undefined;
    let backImagePath: string | undefined;
    let selfieImagePath: string | undefined;

    const ts = Date.now();
    if (data.frontImage) {
      frontImagePath = saveBase64Image(data.frontImage, `${userId}_${ts}_front`);
    }
    if (data.backImage) {
      backImagePath = saveBase64Image(data.backImage, `${userId}_${ts}_back`);
    }
    if (data.selfieImage) {
      selfieImagePath = saveBase64Image(data.selfieImage, `${userId}_${ts}_selfie`);
    }

    const kyc = await db.kycVerification.create({
      data: {
        userId,
        documentType:   data.documentType || "DNI",
        documentNumber: data.documentNumber || null,
        fullName:       data.fullName || null,
        birthDate:      data.birthDate || null,
        frontImagePath: frontImagePath || null,
        backImagePath:  backImagePath  || null,
        selfieImagePath: selfieImagePath || null,
        extractedData:  data.documentNumber ? { documentNumber: data.documentNumber, fullName: data.fullName, birthDate: data.birthDate } : null,
        status: "PENDING",
      },
    });

    // Actualizar kycStatus del usuario a PENDING si estaba en NOT_STARTED/PENDING
    await db.user.update({
      where: { id: userId },
      data: { kycStatus: "PENDING" },
    });

    await logAudit(userId, "KYC_SUBMITTED", { kycId: kyc.id, documentType: data.documentType || "DNI" });

    return kyc;
  },

  // ── Admin ───────────────────────────────────────────
  async listAll(status?: string) {
    const where = status ? { status } : {};
    return db.kycVerification.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, kycStatus: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async approve(adminId: string, kycId: string) {
    const kyc = await db.kycVerification.findUnique({ where: { id: kycId } });
    if (!kyc) throw new Error("Verificación no encontrada");
    if (kyc.status !== "PENDING") throw new Error("La verificación no está pendiente");

    await db.$transaction(async (tx: any) => {
      await tx.kycVerification.update({
        where: { id: kycId },
        data: { status: "APPROVED", reviewedByAdminId: adminId, reviewedAt: new Date() },
      });
      await tx.user.update({
        where: { id: kyc.userId },
        data: { kycStatus: "APPROVED" },
      });
      // Activate wallet if PENDING_KYC
      const wallet = await tx.wallet.findUnique({ where: { userId: kyc.userId } });
      if (wallet && wallet.status === "PENDING_KYC") {
        await tx.wallet.update({ where: { id: wallet.id }, data: { status: "ACTIVE" } });
      }
      await tx.notification.create({
        data: {
          userId: kyc.userId,
          title:   "Identidad verificada",
          message: "Tu identidad fue verificada. Tu cuenta ya está activa.",
          type:    "KYC_APPROVED",
        },
      });
    });

    await logAudit(adminId, "ADMIN_APPROVE_KYC", { kycId, userId: kyc.userId });
    return { message: "KYC aprobado" };
  },

  async reject(adminId: string, kycId: string, reason: string) {
    const kyc = await db.kycVerification.findUnique({ where: { id: kycId } });
    if (!kyc) throw new Error("Verificación no encontrada");
    if (kyc.status !== "PENDING") throw new Error("La verificación no está pendiente");

    await db.$transaction(async (tx: any) => {
      await tx.kycVerification.update({
        where: { id: kycId },
        data: { status: "REJECTED", rejectionReason: reason, reviewedByAdminId: adminId, reviewedAt: new Date() },
      });
      await tx.user.update({
        where: { id: kyc.userId },
        data: { kycStatus: "REJECTED" },
      });
      await tx.notification.create({
        data: {
          userId: kyc.userId,
          title:   "Verificación rechazada",
          message: reason || "Tu verificación fue rechazada. Podés volver a intentarlo.",
          type:    "KYC_REJECTED",
        },
      });
    });

    await logAudit(adminId, "ADMIN_REJECT_KYC", { kycId, userId: kyc.userId, reason });
    return { message: "KYC rechazado" };
  },

  getImagePath(filename: string): string | null {
    const fullPath = path.join(UPLOAD_DIR, path.basename(filename));
    return fs.existsSync(fullPath) ? fullPath : null;
  },
};
