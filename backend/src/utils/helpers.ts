// Generador de alias y CVU para wallets

export function generateAlias(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  return `${normalized}.${randomSuffix}`;
}

/** Genera un CVU simulado de 22 dígitos */
export function generateCVU(): string {
  const prefix = "0000003";
  const rest = Array.from({ length: 15 }, () => Math.floor(Math.random() * 10)).join("");
  return prefix + rest;
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(num);
}
