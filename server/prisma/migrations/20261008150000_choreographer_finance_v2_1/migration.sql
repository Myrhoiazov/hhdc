-- Choreographer Management V2.1, Phase 4: fee agreements, payment records, expense details. Additive.
CREATE TYPE "ExpensePaidBy" AS ENUM ('ORGANIZER', 'CHOREOGRAPHER', 'OTHER');
CREATE TYPE "FeeAgreementStatus" AS ENUM ('PROPOSED', 'COUNTERED', 'AGREED', 'SUPERSEDED', 'CANCELLED');
CREATE TYPE "FeeBasis" AS ENUM ('EVENT', 'SESSION', 'DAY', 'OTHER');
CREATE TYPE "ChoreographerPaymentType" AS ENUM ('ADVANCE', 'FEE', 'REIMBURSEMENT', 'OTHER');
CREATE TYPE "ChoreographerPaymentStatus" AS ENUM ('PLANNED', 'PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

ALTER TABLE "ChoreographerCost"
    ADD COLUMN "estimatedAmount" DECIMAL(14,2),
    ADD COLUMN "actualAmount" DECIMAL(14,2),
    ADD COLUMN "paidBy" "ExpensePaidBy" NOT NULL DEFAULT 'ORGANIZER',
    ADD COLUMN "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "expenseDate" DATE,
    ADD COLUMN "createdById" UUID;

-- Existing cost rows carried one figure: it is an actual amount when the row was marked paid
-- or actual, an estimate otherwise (idempotent: only fills rows that have neither).
UPDATE "ChoreographerCost" SET "actualAmount" = "amount"
WHERE "actualAmount" IS NULL AND "estimatedAmount" IS NULL AND upper("status") IN ('PAID', 'ACTUAL', 'CONFIRMED');
UPDATE "ChoreographerCost" SET "estimatedAmount" = "amount"
WHERE "actualAmount" IS NULL AND "estimatedAmount" IS NULL;

CREATE TABLE "ChoreographerFeeAgreement" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "status" "FeeAgreementStatus" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "feeBasis" "FeeBasis" NOT NULL DEFAULT 'EVENT',
    "scopeDescription" TEXT,
    "agreedAt" TIMESTAMPTZ(6),
    "notes" TEXT,
    "supersedesAgreementId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChoreographerFeeAgreement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChoreographerFeeAgreement_amount_check" CHECK ("amount" >= 0)
);
CREATE INDEX "ChoreographerFeeAgreement_assignmentId_createdAt_idx" ON "ChoreographerFeeAgreement"("assignmentId", "createdAt" DESC);
-- At most one agreed fee per assignment at any time.
CREATE UNIQUE INDEX "ChoreographerFeeAgreement_one_agreed_idx" ON "ChoreographerFeeAgreement"("assignmentId") WHERE "status" = 'AGREED';
ALTER TABLE "ChoreographerFeeAgreement" ADD CONSTRAINT "ChoreographerFeeAgreement_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EventChoreographer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ChoreographerPaymentRecord" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "agreementId" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "type" "ChoreographerPaymentType" NOT NULL,
    "status" "ChoreographerPaymentStatus" NOT NULL DEFAULT 'PLANNED',
    "paymentDate" DATE,
    "reference" TEXT,
    "invoiceDocumentId" UUID,
    "recordedById" UUID NOT NULL,
    "confirmedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ChoreographerPaymentRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChoreographerPaymentRecord_amount_check" CHECK ("amount" > 0)
);
CREATE INDEX "ChoreographerPaymentRecord_assignmentId_status_paymentDate_idx" ON "ChoreographerPaymentRecord"("assignmentId", "status", "paymentDate");
ALTER TABLE "ChoreographerPaymentRecord" ADD CONSTRAINT "ChoreographerPaymentRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EventChoreographer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
