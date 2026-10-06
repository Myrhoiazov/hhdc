-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProviderName" ADD VALUE 'MOLLIE';
ALTER TYPE "ProviderName" ADD VALUE 'GOOGLE_DRIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProviderType" ADD VALUE 'MESSAGING';
ALTER TYPE "ProviderType" ADD VALUE 'SIGNATURE';

-- AlterTable
ALTER TABLE "DeliveryLog" ADD COLUMN     "destination" TEXT;

-- AlterTable
ALTER TABLE "OutboxEvent" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "createdBy" UUID,
ADD COLUMN     "eventId" UUID,
ADD COLUMN     "personId" UUID,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'NORMAL';

