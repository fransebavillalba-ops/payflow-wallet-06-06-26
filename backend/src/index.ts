// PayFlow Backend v3 — Entry Point

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./routes";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Seguridad base ────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health ────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "PayFlow API",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// ── Rutas ─────────────────────────────────────────────
app.use("/api", routes);

// ── 404 ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Endpoint no encontrado" });
});

// ── Error handler ─────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Error]", err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Error interno del servidor" : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║      PayFlow API Server v3.0              ║
║      http://localhost:${PORT}               ║
║      Env: ${(process.env.NODE_ENV || "development").padEnd(16)}          ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;
