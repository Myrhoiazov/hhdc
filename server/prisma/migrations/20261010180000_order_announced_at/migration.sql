-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "announcedAt" TIMESTAMPTZ(6);


-- Orders stored before this column existed are history: the chat is not told about them.
UPDATE "Order" SET "announcedAt" = CURRENT_TIMESTAMP WHERE "announcedAt" IS NULL;
