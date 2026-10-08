-- Choreographer Management V2.1, Phase 2: storage objects, media, contacts, biography versions. Additive.
CREATE TYPE "MediaRightsStatus" AS ENUM ('UNKNOWN', 'PERMITTED', 'RESTRICTED');
CREATE TYPE "ChoreographerContactKind" AS ENUM ('SELF_SECONDARY', 'MANAGER', 'AGENT', 'ASSISTANT', 'ACCOUNTING', 'OTHER');
CREATE TYPE "ChoreographerBioKind" AS ENUM ('SHORT', 'FULL', 'PROMO');

CREATE TABLE "StorageObject" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'LOCAL',
    "key" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StorageObject_key_key" ON "StorageObject"("key");

CREATE TABLE "ChoreographerMedia" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "originalObjectId" UUID NOT NULL,
    "displayObjectId" UUID NOT NULL,
    "thumbObjectId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "caption" TEXT,
    "credit" TEXT,
    "rightsStatus" "MediaRightsStatus" NOT NULL DEFAULT 'UNKNOWN',
    "rightsNotes" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "ChoreographerMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChoreographerMedia_personId_deletedAt_position_idx" ON "ChoreographerMedia"("personId", "deletedAt", "position");
-- At most one cover among a person's active photos (Prisma cannot express a partial unique index).
CREATE UNIQUE INDEX "ChoreographerMedia_one_cover_idx" ON "ChoreographerMedia"("personId") WHERE "isCover" AND "deletedAt" IS NULL;
ALTER TABLE "ChoreographerMedia" ADD CONSTRAINT "ChoreographerMedia_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ChoreographerContact" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "contactPersonId" UUID,
    "kind" "ChoreographerContactKind" NOT NULL,
    "name" TEXT,
    "organization" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "locale" TEXT,
    "preferredChannel" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATE,
    "validTo" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ChoreographerContact_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChoreographerContact_personId_kind_isActive_idx" ON "ChoreographerContact"("personId", "kind", "isActive");
CREATE INDEX "ChoreographerContact_email_idx" ON "ChoreographerContact"("email");
ALTER TABLE "ChoreographerContact" ADD CONSTRAINT "ChoreographerContact_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ChoreographerBioVersion" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "locale" VARCHAR(8) NOT NULL,
    "kind" "ChoreographerBioKind" NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChoreographerBioVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChoreographerBioVersion_personId_locale_kind_version_key" ON "ChoreographerBioVersion"("personId", "locale", "kind", "version");
CREATE INDEX "ChoreographerBioVersion_personId_isCurrent_idx" ON "ChoreographerBioVersion"("personId", "isCurrent");
-- Exactly one current version per language and kind.
CREATE UNIQUE INDEX "ChoreographerBioVersion_one_current_idx" ON "ChoreographerBioVersion"("personId", "locale", "kind") WHERE "isCurrent";
ALTER TABLE "ChoreographerBioVersion" ADD CONSTRAINT "ChoreographerBioVersion_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
