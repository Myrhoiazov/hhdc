-- CreateTable
CREATE TABLE "EventExpense" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "personId" UUID,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "expenseDate" DATE,
    "paidAt" TIMESTAMPTZ(6),
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EventExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventExpense_eventId_status_idx" ON "EventExpense"("eventId", "status");

-- CreateIndex
CREATE INDEX "EventExpense_personId_idx" ON "EventExpense"("personId");

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

