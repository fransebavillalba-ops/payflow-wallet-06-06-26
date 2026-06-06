// Servicio de autenticación v3 — KYC + Wallet formal

import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { generateToken, generateRefreshToken, verifyRefreshToken, getRefreshExpiry } from "../utils/jwt";
import { generateAlias, generateCVU } from "../utils/helpers";
import { logAudit } from "../utils/audit";
import { validate, RegisterSchema, LoginSchema, KycSchema, PinSchema } from "../utils/validate";
import { RegisterDTO, LoginDTO } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const BCRYPT_ROUNDS = 12;

export const AuthService = {
  async register(data: RegisterDTO) {
    const { name, email, password } = validate(RegisterSchema, data);

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      const err = new Error("El email ya está registrado en PayFlow");
      (err as any).statusCode = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let alias = generateAlias(name);
    while (await db.wallet.findUnique({ where: { alias } })) {
      alias = generateAlias(name);
    }

    let cvu = generateCVU();
    while (await db.wallet.findUnique({ where: { cvu } })) {
      cvu = generateCVU();
    }

    const user = await db.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: { name, email, password: hashedPassword, role: "USER", kycStatus: "PENDING" },
      });
      await tx.wallet.create({
        data: { alias, cvu, balance: 0, status: "PENDING_KYC", userId: newUser.id },
      });
      await tx.auditLog.create({
        data: { userId: newUser.id, action: "REGISTER", metadata: { email, name } },
      });
      return newUser;
    });

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken  = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await db.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getRefreshExpiry() },
    });

    return {
      accessToken,
      refreshToken,
      token: accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, kycStatus: user.kycStatus },
    };
  },

  async login(data: LoginDTO) {
    const { email, password } = validate(LoginSchema, data);

    const user = await db.user.findUnique({
      where: { email },
      include: { wallet: true },
    });

    if (!user) throw new Error("Email o contraseña incorrectos");

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await logAudit(user.id, "LOGIN_FAILED", { email, reason: "wrong_password" });
      throw new Error("Email o contraseña incorrectos");
    }

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken  = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await db.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getRefreshExpiry() },
    });

    await logAudit(user.id, "LOGIN", { email });

    return {
      accessToken,
      refreshToken,
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kycStatus,
        wallet: user.wallet ? {
          id: user.wallet.id,
          alias: user.wallet.alias,
          cvu: user.wallet.cvu,
          status: user.wallet.status,
          balance: Number(user.wallet.balance),
        } : null,
      },
    };
  },

  async refreshSession(refreshTokenStr: string) {
    const stored = await db.refreshToken.findUnique({ where: { token: refreshTokenStr } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new Error("Refresh token inválido o expirado");
    }

    const payload = verifyRefreshToken(refreshTokenStr);
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new Error("Usuario no encontrado");

    await db.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const newAccess  = generateToken(tokenPayload);
    const newRefresh = generateRefreshToken(tokenPayload);

    await db.refreshToken.create({
      data: { token: newRefresh, userId: user.id, expiresAt: getRefreshExpiry() },
    });

    return { accessToken: newAccess, refreshToken: newRefresh, token: newAccess };
  },

  async logout(refreshTokenStr: string) {
    await db.refreshToken.updateMany({
      where: { token: refreshTokenStr },
      data: { revoked: true },
    });
  },

  async submitKyc(userId: string, data: unknown) {
    const { firstName, lastName, dni, birthDate, gender } = validate(KycSchema, data);

    // Check DNI uniqueness
    const existingDni = await db.user.findFirst({
      where: { dni, NOT: { id: userId } },
    });
    if (existingDni) {
      const err = new Error("El DNI ya está registrado en otro usuario");
      (err as any).statusCode = 409;
      throw err;
    }

    const user = await db.user.findUnique({ where: { id: userId }, include: { wallet: true } });
    if (!user) throw new Error("Usuario no encontrado");
    if (user.kycStatus === "APPROVED") throw new Error("El KYC ya fue completado");

    const updated = await db.$transaction(async (tx: any) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { firstName, lastName, dni, birthDate: new Date(birthDate), gender, kycStatus: "APPROVED" },
      });
      if (user.wallet) {
        await tx.wallet.update({
          where: { id: user.wallet.id },
          data: { status: "ACTIVE" },
        });
      }
      await tx.auditLog.create({
        data: { userId, action: "KYC_APPROVED", metadata: { dni, firstName, lastName } },
      });
      await tx.auditLog.create({
        data: { userId, action: "WALLET_ACTIVATED", metadata: { walletId: user.wallet?.id } },
      });
      await tx.notification.create({
        data: {
          userId,
          title: "✅ KYC Aprobado",
          message: "Tu identidad fue verificada. Tu cuenta está activa y lista para operar.",
          type: "KYC_APPROVED",
        },
      });
      return u;
    });

    return { kycStatus: updated.kycStatus, walletStatus: "ACTIVE" };
  },

  async setPin(userId: string, data: unknown) {
    const { pin } = validate(PinSchema, data);
    const hash = await bcrypt.hash(pin, 10);
    await db.user.update({
      where: { id: userId },
      data: { transferPinHash: hash, pinFailedAttempts: 0, pinLockedUntil: null },
    });
    return { message: "PIN configurado correctamente" };
  },

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.transferPinHash) return true; // no pin set = skip

    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      throw new Error("PIN bloqueado temporalmente. Intentá en unos minutos.");
    }

    const valid = await bcrypt.compare(pin, user.transferPinHash);
    if (!valid) {
      const attempts = user.pinFailedAttempts + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 5 * 60 * 1000) : null;
      await db.user.update({
        where: { id: userId },
        data: { pinFailedAttempts: attempts, pinLockedUntil: lockUntil },
      });
      throw new Error("PIN incorrecto" + (attempts >= 5 ? ". Cuenta bloqueada 5 minutos." : ""));
    }

    await db.user.update({ where: { id: userId }, data: { pinFailedAttempts: 0, pinLockedUntil: null } });
    return true;
  },
};
