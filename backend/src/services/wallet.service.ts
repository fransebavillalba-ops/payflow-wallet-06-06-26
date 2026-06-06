// Servicio de Wallet v3

import prisma from "../utils/prisma";
import { validate, ContactSchema } from "../utils/validate";
import { ContactDTO } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export const WalletService = {
  async getMyWallet(userId: string) {
    const wallet = await db.wallet.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true, kycStatus: true, role: true } } },
    });
    if (!wallet) throw new Error("Wallet no encontrada");

    return {
      id: wallet.id,
      alias: wallet.alias,
      cvu: wallet.cvu || "",
      balance: Number(wallet.balance),
      status: wallet.status,
      kycStatus: wallet.user.kycStatus,
      owner: wallet.user.name,
      email: wallet.user.email,
      role: wallet.user.role,
      createdAt: wallet.createdAt,
    };
  },

  async findByAlias(alias: string) {
    const wallet = await db.wallet.findUnique({
      where: { alias },
      include: { user: { select: { name: true } } },
    });
    if (!wallet) return null;
    return { id: wallet.id, alias: wallet.alias, cvu: wallet.cvu || "", ownerName: wallet.user.name, status: wallet.status };
  },

  async findByCvu(cvu: string) {
    const wallet = await db.wallet.findUnique({
      where: { cvu },
      include: { user: { select: { name: true } } },
    });
    if (!wallet) return null;
    return { id: wallet.id, alias: wallet.alias, cvu: wallet.cvu, ownerName: wallet.user.name, status: wallet.status };
  },

  async getQrData(userId: string, amount?: number, concept?: string) {
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Wallet no encontrada");
    return {
      alias: wallet.alias,
      cvu: wallet.cvu,
      amount: amount || null,
      concept: concept || null,
    };
  },

  async getContacts(userId: string) {
    return db.contact.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  },

  async addContact(userId: string, dto: ContactDTO) {
    const { alias, label } = validate(ContactSchema, dto);
    const wallet = await db.wallet.findUnique({ where: { alias } });
    if (!wallet) throw new Error(`No existe ninguna wallet con alias "${alias}"`);

    return db.contact.upsert({
      where: { userId_alias: { userId, alias } },
      update: { label },
      create: { userId, alias, label },
    });
  },

  async removeContact(userId: string, alias: string) {
    await db.contact.deleteMany({ where: { userId, alias } });
  },
};
