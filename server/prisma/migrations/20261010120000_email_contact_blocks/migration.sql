-- CreateTable
CREATE TABLE "EmailContactBlock" (
    "address" TEXT NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailContactBlock_pkey" PRIMARY KEY ("address")
);
