-- Choreographer Management V2.1, Phase 5: file documents with versions, contract and invoice metadata. Additive.
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'RIDER';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'TRAVEL';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'HOTEL';

CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "InvoiceStatus" AS ENUM ('RECEIVED', 'REVIEWED', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'DISPUTED');

ALTER TABLE "Document"
    ADD COLUMN "eventId" UUID,
    ADD COLUMN "assignmentId" UUID,
    ADD COLUMN "currentVersion" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "notes" TEXT,
    ADD COLUMN "createdById" UUID,
    ADD COLUMN "archivedAt" TIMESTAMPTZ(6);
CREATE INDEX "Document_eventId_idx" ON "Document"("eventId");
CREATE INDEX "Document_assignmentId_idx" ON "Document"("assignmentId");

CREATE TABLE "DocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "storageObjectId" UUID NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMPTZ(6),
    "signedAt" TIMESTAMPTZ(6),
    "expiresAt" DATE,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Contract_documentId_key" ON "Contract"("documentId");
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "invoiceNumber" TEXT,
    "issuerName" TEXT,
    "issueDate" DATE,
    "dueDate" DATE,
    "amount" DECIMAL(12,2),
    "currency" CHAR(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "paidManually" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_documentId_key" ON "Invoice"("documentId");
CREATE INDEX "Invoice_issuerName_invoiceNumber_idx" ON "Invoice"("issuerName", "invoiceNumber");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
