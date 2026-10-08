-- Choreographer Management V2.1, Phase 6: explicit conversation links. Additive.
CREATE TYPE "ConversationLinkReason" AS ENUM ('DIRECT_EMAIL', 'MANUAL', 'PROVIDER_REFERENCE');

CREATE TABLE "ChoreographerConversationLink" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "assignmentId" UUID,
    "linkReason" "ConversationLinkReason" NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMPTZ(6),
    "removedById" UUID,
    "removalNote" TEXT,
    CONSTRAINT "ChoreographerConversationLink_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChoreographerConversationLink_personId_removedAt_idx" ON "ChoreographerConversationLink"("personId", "removedAt");
CREATE INDEX "ChoreographerConversationLink_conversationId_idx" ON "ChoreographerConversationLink"("conversationId");
-- One active link per conversation and choreographer; removed links stay as history.
CREATE UNIQUE INDEX "ChoreographerConversationLink_one_active_idx" ON "ChoreographerConversationLink"("conversationId", "personId") WHERE "removedAt" IS NULL;
ALTER TABLE "ChoreographerConversationLink" ADD CONSTRAINT "ChoreographerConversationLink_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChoreographerConversationLink" ADD CONSTRAINT "ChoreographerConversationLink_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
