-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "downloadUrl" TEXT,
ADD COLUMN     "shopName" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "downloadUrl" TEXT,
ADD COLUMN     "serviceFee" DECIMAL(14,2);

