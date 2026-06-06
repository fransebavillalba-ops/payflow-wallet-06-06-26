// Tests de autenticación

import { AuthService } from "../services/auth.service";

// Mock prisma
jest.mock("../utils/prisma", () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({
      user: { create: jest.fn().mockResolvedValue({ id: "u1", name: "Test", email: "test@test.com", role: "USER" }) },
      wallet: { create: jest.fn() },
    })),
  },
}));

jest.mock("../utils/audit", () => ({ logAudit: jest.fn() }));

import prisma from "../utils/prisma";

describe("AuthService.register", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lanza error si email ya existe", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });
    await expect(
      AuthService.register({ name: "Test", email: "existing@test.com", password: "password123" })
    ).rejects.toThrow("El email ya está registrado en PayFlow");
  });

  it("lanza error si password es muy corta", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      AuthService.register({ name: "Test", email: "new@test.com", password: "123" })
    ).rejects.toThrow();
  });
});

describe("AuthService.login", () => {
  it("lanza error si usuario no existe", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      AuthService.login({ email: "noexiste@test.com", password: "pass123" })
    ).rejects.toThrow("Email o contraseña incorrectos");
  });
});
