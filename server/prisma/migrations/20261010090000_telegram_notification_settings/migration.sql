-- CreateTable
CREATE TABLE "TelegramNotificationSetting" (
    "key" VARCHAR(64) NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "TelegramNotificationSetting_pkey" PRIMARY KEY ("key")
);
-- CreateIndex
CREATE INDEX "TelegramNotificationSetting_updatedById_idx" ON "TelegramNotificationSetting"("updatedById");
-- AddForeignKey
ALTER TABLE "TelegramNotificationSetting" ADD CONSTRAINT "TelegramNotificationSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
