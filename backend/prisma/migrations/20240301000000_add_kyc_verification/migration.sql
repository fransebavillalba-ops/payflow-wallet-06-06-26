-- KYC Verification table
DO $$ BEGIN
  CREATE TYPE "KycVerifStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "kyc_verifications" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "documentType"      TEXT NOT NULL DEFAULT 'DNI',
  "documentNumber"    TEXT,
  "fullName"          TEXT,
  "birthDate"         TEXT,
  "frontImagePath"    TEXT,
  "backImagePath"     TEXT,
  "selfieImagePath"   TEXT,
  "extractedData"     JSONB,
  "status"            "KycVerifStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason"   TEXT,
  "reviewedByAdminId" TEXT,
  "reviewedAt"        TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "kyc_verifications_userId_idx" ON "kyc_verifications"("userId");
CREATE INDEX IF NOT EXISTS "kyc_verifications_status_idx" ON "kyc_verifications"("status");
ALTER TABLE "kyc_verifications"
  ADD CONSTRAINT "kyc_verifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
