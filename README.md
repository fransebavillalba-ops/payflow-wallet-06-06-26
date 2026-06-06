# 💳 PayFlow — Billetera Digital v3

> **Proyecto académico** — Ingeniería de Software II, Universidad de la Cuenca del Plata.
> ⚠️ **Todo el dinero y las operaciones son completamente ficticias.**

---

## 🛠 Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | JWT (access 15m + refresh 7d) |
| Validaciones | Zod |
| Passwords | bcryptjs (12 rounds) |
| Criptografía | Node.js crypto — SHA-256 |

---

## ⚙️ Instalación

### 1. Requisitos

- Node.js ≥ 18
- PostgreSQL corriendo (puerto 5432)
- npm ≥ 9

### 2. Variables de entorno

```bash
# Backend
cd backend
cp .env.example .env
# Editá DATABASE_URL, JWT_SECRET y JWT_REFRESH_SECRET
```

```bash
# Frontend
cd frontend
cp .env.example .env
# VITE_API_URL ya viene configurado como http://localhost:3001/api
```

### 3. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Base de datos y Prisma

```bash
cd backend

# Generar el cliente Prisma
npx prisma generate

# Crear/actualizar tablas (desarrollo)
npx prisma db push

# O con migraciones formales
npx prisma migrate dev
```

### 5. Seed (datos de prueba)

```bash
cd backend
npm run prisma:seed
# equivalente: npx ts-node src/seed.ts
```

Las credenciales de los usuarios demo están en **`CREDENCIALES_DEMO.md`**.
**No se muestran en la interfaz** para mantener una apariencia profesional.

### 6. Ejecutar

```bash
# Backend (puerto 3001)
cd backend && npm run dev

# Frontend (puerto 5173) — nueva terminal
cd frontend && npm run dev
```

- **App:** http://localhost:5173
- **API:** http://localhost:3001
- **Health:** http://localhost:3001/health

---

## 🔐 Ledger SHA-256

Cada transacción exitosa genera un bloque criptográfico encadenado:

```
SHA-256( blockNumber + transactionId + stableStringify(payload) + previousHash )
```

**Punto clave:** se usa `stableStringify()` en lugar de `JSON.stringify()` para garantizar que el orden de claves del objeto sea siempre el mismo, independientemente de cómo PostgreSQL devuelva el JSON. Esto evita el problema de "Bloque roto #1" que aparecía por diferencias de serialización.

Para verificar la cadena:
- Ir al Panel Admin → pestaña **Ledger**
- Clic en "Reverificar cadena"
- Resultado esperado: **"Ledger verificado correctamente. N bloques íntegros."**

---

## 🪪 KYC con cámara

### Flujo del usuario

1. Ir al dashboard → banner "Verificación de identidad" → **Iniciar verificación**
2. Completar datos del documento (número, nombre, fecha de nacimiento)
3. Fotografiar el frente del DNI con la cámara del dispositivo
4. Opcionalmente tomar una selfie
5. Enviar → estado pasa a **Pendiente de revisión**

### Flujo del administrador

1. Panel Admin → pestaña **KYC**
2. Ver lista de verificaciones (filtrar por PENDING/APPROVED/REJECTED)
3. Revisar datos y aprobar (✓) o rechazar (✕ con motivo)
4. El usuario recibe notificación con el resultado

### Tecnología usada

- `navigator.mediaDevices.getUserMedia()` para acceder a la cámara
- Canvas API para capturar fotogramas
- Imágenes enviadas como base64 al backend
- Almacenamiento privado en `backend/uploads/kyc/` (no expuesto públicamente)
- Las imágenes solo son accesibles por el admin mediante endpoint autenticado

---

## 💳 Copiar Alias y CVU

Desde el dashboard, en la tarjeta virtual:
- Tocá el botón **"Copiar"** al lado del Alias o del CVU
- El texto se copia al portapapeles usando `navigator.clipboard.writeText()`
- El botón cambia momentáneamente a **"Copiado ✓"** como confirmación visual
- Si el navegador no lo permite, hay un fallback con `execCommand('copy')`

---

## 👤 Roles y permisos

| Rol | Acceso |
|-----|--------|
| **USER** | Dashboard, transferencias, depósitos, retiros, mercado, QR, contactos, notificaciones, solicitudes de pago, KYC propio |
| **ADMIN** | Todo lo anterior + panel admin: usuarios, wallets, transacciones, KYC, ledger, auditoría |

---

## 📡 Endpoints principales

### Públicos
- `GET  /health` — Estado del servidor

### Auth
- `POST /api/auth/register` — Registro
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Renovar token
- `POST /api/auth/logout` — Logout

### KYC
- `GET  /api/kyc/me` — Mi estado KYC
- `POST /api/kyc/submit` — Enviar verificación con imágenes

### Wallet
- `GET  /api/wallet/me` — Mi wallet
- `GET  /api/wallet/qr` — Datos QR
- `GET  /api/wallet/find/:alias` — Buscar por alias

### Transacciones
- `POST /api/transactions/transfer` — Transferir
- `POST /api/transactions/deposit` — Cargar saldo
- `POST /api/transactions/withdraw` — Retirar saldo
- `GET  /api/transactions/history` — Historial
- `GET  /api/transactions/:id/receipt` — Comprobante

### Admin (requiere rol ADMIN)
- `GET  /api/admin/metrics` — Métricas
- `GET  /api/admin/kyc/verifications` — Solicitudes KYC
- `PATCH /api/admin/kyc/verifications/:id/approve` — Aprobar KYC
- `PATCH /api/admin/kyc/verifications/:id/reject` — Rechazar KYC
- `GET  /api/admin/ledger/verify` — Verificar cadena SHA-256
- `PATCH /api/admin/wallets/:id/block` — Bloquear wallet
- `PATCH /api/admin/wallets/:id/unblock` — Desbloquear wallet

---

## ⚠️ Limitaciones

- Dinero ficticio — sin integración bancaria real
- KYC sin validación contra RENAPER u organismos oficiales
- OCR no implementado: los datos se ingresan manualmente (arquitectura preparada para integración futura)
- Precios del mercado simulados internamente
- Para producción requeriría: HTTPS, variables de entorno seguras, almacenamiento en la nube para imágenes KYC, OCR real

---

## 📄 Licencia

Proyecto académico — Universidad de la Cuenca del Plata, 2026.
