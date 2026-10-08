-- Choreographer Management V2.1, Phase 7: internal notes and task reminders. Additive.
CREATE TABLE "ChoreographerNote" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "assignmentId" UUID,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "ChoreographerNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChoreographerNote_personId_deletedAt_isPinned_idx" ON "ChoreographerNote"("personId", "deletedAt", "isPinned");
ALTER TABLE "ChoreographerNote" ADD CONSTRAINT "ChoreographerNote_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" ADD COLUMN "reminderSentAt" TIMESTAMPTZ(6);
CREATE INDEX "Task_personId_idx" ON "Task"("personId");
