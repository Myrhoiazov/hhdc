-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "listPrice" DECIMAL(14,2),
ADD COLUMN     "price" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL,
    "providerConnectionId" UUID,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,2),
    "status" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(6),
    "endsAt" TIMESTAMPTZ(6),
    "codes" TEXT[],
    "rawData" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_providerConnectionId_externalId_key" ON "Coupon"("providerConnectionId", "externalId");

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_providerConnectionId_fkey" FOREIGN KEY ("providerConnectionId") REFERENCES "ProviderConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

