-- CreateTable
CREATE TABLE "TicketType" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "providerConnectionId" UUID,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "vatPercentage" DECIMAL(5,2),
    "status" TEXT NOT NULL,
    "availableFrom" TIMESTAMPTZ(6),
    "availableUntil" TIMESTAMPTZ(6),
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "rawData" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TicketType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketType_eventId_idx" ON "TicketType"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketType_providerConnectionId_externalId_key" ON "TicketType"("providerConnectionId", "externalId");

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_providerConnectionId_fkey" FOREIGN KEY ("providerConnectionId") REFERENCES "ProviderConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

