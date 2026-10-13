-- CreateTable
CREATE TABLE "EventTeamMember" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "duties" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EventTeamMember_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "EventExpense" ADD COLUMN "teamMemberId" UUID;

-- CreateIndex
CREATE INDEX "EventTeamMember_personId_idx" ON "EventTeamMember"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTeamMember_eventId_personId_roleTitle_key" ON "EventTeamMember"("eventId", "personId", "roleTitle");

-- CreateIndex
CREATE INDEX "EventExpense_teamMemberId_idx" ON "EventExpense"("teamMemberId");

-- AddForeignKey
ALTER TABLE "EventTeamMember" ADD CONSTRAINT "EventTeamMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTeamMember" ADD CONSTRAINT "EventTeamMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventExpense" ADD CONSTRAINT "EventExpense_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "EventTeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
