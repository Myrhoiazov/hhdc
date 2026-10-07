-- CreateTable
CREATE TABLE "AiSimulationRun" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "promptVersion" TEXT,
    "result" JSONB,
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSimulationRun_createdAt_idx" ON "AiSimulationRun"("createdAt");
