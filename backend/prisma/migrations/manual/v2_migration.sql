-- PayFlow v2: Migración manual para bases de datos existentes
-- Ejecutar solo si ya tenés una base de datos con el schema v1

-- 1. Agregar nuevos valores al enum TransactionStatus
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "TransactionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- 2. Agregar enum TransactionType
DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('TRANSFER', 'DEPOSIT', 'WITHDRAWAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Agregar columna type a transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "type" "TransactionType" NOT NULL DEFAULT 'TRANSFER';

-- 4. Agregar CVU a wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS cvu VARCHAR(22);
UPDATE wallets SET cvu = '0000003' || LPAD(FLOOR(RANDOM() * 1000000000000000)::TEXT, 15, '0') WHERE cvu IS NULL;
ALTER TABLE wallets ALTER COLUMN cvu SET NOT NULL;
ALTER TABLE wallets ADD CONSTRAINT wallets_cvu_key UNIQUE (cvu);

-- 5. Crear tabla refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  "userId" UUID NOT NULL REFERENCES users(id),
  "expiresAt" TIMESTAMP NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_userId_idx ON refresh_tokens("userId");

-- 6. Crear tabla audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  "userId" UUID NOT NULL REFERENCES users(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_userId_idx ON audit_logs("userId");
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);

-- 7. Crear tabla contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES users(id),
  alias TEXT NOT NULL,
  label TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT contacts_userId_alias_key UNIQUE("userId", alias)
);
CREATE INDEX IF NOT EXISTS contacts_userId_idx ON contacts("userId");
