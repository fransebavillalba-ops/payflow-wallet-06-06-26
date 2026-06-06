-- PayFlow v3 Migration: Formal Admin + KYC + Ledger + Market + Notifications

-- Add KYC and PIN fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dni" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "birthDate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "transferPinHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pinLockedUntil" TIMESTAMP(3);

-- KycStatus enum
DO $$ BEGIN
  CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'REVIEW', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING';

-- WalletStatus enum
DO $$ BEGIN
  CREATE TYPE "WalletStatus" AS ENUM ('PENDING_KYC', 'ACTIVE', 'SUSPENDED', 'BLOCKED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add status and cvu to wallets (cvu may not exist on old DB)
ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "cvu" TEXT;
UPDATE "wallets" SET "cvu" = '0000003' || lpad(floor(random()*1000000000000000)::text, 15, '0') WHERE "cvu" IS NULL;
ALTER TABLE "wallets" ALTER COLUMN "cvu" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_cvu_key" ON "wallets"("cvu");

ALTER TABLE "wallets" ADD COLUMN IF NOT EXISTS "status" "WalletStatus" NOT NULL DEFAULT 'PENDING_KYC';
-- Activate existing wallets that have balance (they were active in MVP)
UPDATE "wallets" SET "status" = 'ACTIVE' WHERE "balance" > 0;

-- failureReason on transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

-- TransactionType: add new values
DO $$ BEGIN
  ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'MARKET_BUY';
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'MARKET_SELL';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- LedgerDirection enum
DO $$ BEGIN
  CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- LedgerEntry table
CREATE TABLE IF NOT EXISTS "ledger_entries" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "direction" "LedgerDirection" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "balanceBefore" DECIMAL(18,2) NOT NULL,
  "balanceAfter" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ledger_entries_transactionId_idx" ON "ledger_entries"("transactionId");
CREATE INDEX IF NOT EXISTS "ledger_entries_walletId_idx" ON "ledger_entries"("walletId");
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- LedgerBlock table
CREATE SEQUENCE IF NOT EXISTS ledger_block_seq;
CREATE TABLE IF NOT EXISTS "ledger_blocks" (
  "id" TEXT NOT NULL,
  "blockNumber" INTEGER NOT NULL DEFAULT nextval('ledger_block_seq'),
  "transactionId" TEXT NOT NULL,
  "previousHash" TEXT NOT NULL,
  "currentHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "algorithm" TEXT NOT NULL DEFAULT 'SHA-256',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_blocks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_blocks_blockNumber_key" ON "ledger_blocks"("blockNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_blocks_transactionId_key" ON "ledger_blocks"("transactionId");
CREATE INDEX IF NOT EXISTS "ledger_blocks_blockNumber_idx" ON "ledger_blocks"("blockNumber");
ALTER TABLE "ledger_blocks" ADD CONSTRAINT "ledger_blocks_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications"("read");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PaymentRequestStatus enum
DO $$ BEGIN
  CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- PaymentRequest
CREATE TABLE IF NOT EXISTS "payment_requests" (
  "id" TEXT NOT NULL,
  "requesterWalletId" TEXT NOT NULL,
  "payerWalletId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "concept" TEXT NOT NULL,
  "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payment_requests_requesterWalletId_idx" ON "payment_requests"("requesterWalletId");
CREATE INDEX IF NOT EXISTS "payment_requests_payerWalletId_idx" ON "payment_requests"("payerWalletId");
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_requesterWalletId_fkey" FOREIGN KEY ("requesterWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_payerWalletId_fkey" FOREIGN KEY ("payerWalletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AssetCategory enum
DO $$ BEGIN
  CREATE TYPE "AssetCategory" AS ENUM ('ETF_INDEX', 'CRYPTO', 'COMMODITY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- MarketAsset
CREATE TABLE IF NOT EXISTS "market_assets" (
  "id" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "AssetCategory" NOT NULL,
  "currentPrice" DECIMAL(18,2) NOT NULL,
  "priceHistory" JSONB NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "market_assets_symbol_key" ON "market_assets"("symbol");

-- MarketOperation
CREATE TABLE IF NOT EXISTS "market_operations" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "quantity" DECIMAL(18,8) NOT NULL,
  "priceAtOperation" DECIMAL(18,2) NOT NULL,
  "totalAmount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "market_operations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "market_operations_transactionId_key" ON "market_operations"("transactionId");
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "market_operations" ADD CONSTRAINT "market_operations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "market_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PortfolioHolding
CREATE TABLE IF NOT EXISTS "portfolio_holdings" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "quantity" DECIMAL(18,8) NOT NULL,
  "avgPrice" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portfolio_holdings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_holdings_walletId_assetId_key" ON "portfolio_holdings"("walletId", "assetId");
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique index on dni
CREATE UNIQUE INDEX IF NOT EXISTS "users_dni_key" ON "users"("dni") WHERE "dni" IS NOT NULL;
