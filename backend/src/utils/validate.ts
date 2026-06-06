// Validaciones con Zod v3

import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export const TransferSchema = z.object({
  receiverAlias: z.string().min(3, "Alias inválido"),
  amount: z.number().positive("El monto debe ser mayor a 0").max(1_000_000, "Monto máximo $1.000.000"),
  concept: z.string().min(1, "Concepto requerido").max(255),
  idempotencyKey: z.string().uuid("idempotencyKey debe ser un UUID"),
  transferPin: z.string().optional(),
});

export const FundSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a 0").max(10_000_000),
  concept: z.string().optional(),
});

export const ContactSchema = z.object({
  alias: z.string().min(3),
  label: z.string().max(100).optional(),
});

export const KycSchema = z.object({
  firstName: z.string().min(2, "Nombre requerido"),
  lastName: z.string().min(2, "Apellido requerido"),
  dni: z.string().min(7, "DNI inválido").max(10),
  birthDate: z.string().min(1, "Fecha de nacimiento requerida"),
  gender: z.enum(["M", "F", "X"], { errorMap: () => ({ message: "Sexo inválido" }) }),
});

export const PinSchema = z.object({
  pin: z.string().min(4).max(6).regex(/^\d+$/, "El PIN debe ser numérico"),
});

export const PaymentRequestSchema = z.object({
  payerAlias: z.string().min(3, "Alias del pagador requerido"),
  amount: z.number().positive("El monto debe ser mayor a 0").max(1_000_000),
  concept: z.string().min(1, "Concepto requerido").max(255),
});

export const MarketTradeSchema = z.object({
  assetId: z.string().min(1, "Asset requerido"),
  operationType: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map((e) => e.message).join(", ");
    throw new Error(messages);
  }
  return result.data;
}
