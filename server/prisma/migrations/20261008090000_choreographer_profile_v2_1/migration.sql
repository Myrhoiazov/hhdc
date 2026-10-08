-- Choreographer Management V2.1, Phase 1: additive profile extension.
-- CreateEnum
CREATE TYPE "ChoreographerRelationshipStatus" AS ENUM ('NEW', 'CONTACTED', 'NEGOTIATING', 'ACTIVE', 'RETURNING', 'INACTIVE', 'DO_NOT_CONTACT');

-- AlterTable
ALTER TABLE "ChoreographerProfile"
    ADD COLUMN "stageName" TEXT,
    ADD COLUMN "bioShort" TEXT,
    ADD COLUMN "bioFull" TEXT,
    ADD COLUMN "countryCode" VARCHAR(2),
    ADD COLUMN "city" TEXT,
    ADD COLUMN "timezone" TEXT,
    ADD COLUMN "relationshipStatus" "ChoreographerRelationshipStatus" NOT NULL DEFAULT 'NEW',
    ADD COLUMN "websiteUrl" TEXT,
    ADD COLUMN "instagramUrl" TEXT,
    ADD COLUMN "tiktokUrl" TEXT,
    ADD COLUMN "youtubeUrl" TEXT,
    ADD COLUMN "styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "updatedById" UUID;

-- CreateIndex
CREATE INDEX "ChoreographerProfile_relationshipStatus_idx" ON "ChoreographerProfile"("relationshipStatus");

-- Backfill (idempotent): the legacy biography becomes the full biography where none was written.
UPDATE "ChoreographerProfile" SET "bioFull" = "bio" WHERE "bioFull" IS NULL AND "bio" IS NOT NULL;

-- Backfill (idempotent): every person who already has the CHOREOGRAPHER role gets a profile.
INSERT INTO "ChoreographerProfile" ("id", "personId", "updatedAt")
SELECT gen_random_uuid(), r."personId", CURRENT_TIMESTAMP
FROM "PersonRole" r
WHERE r."role" = 'CHOREOGRAPHER'
    AND NOT EXISTS (SELECT 1 FROM "ChoreographerProfile" p WHERE p."personId" = r."personId");
