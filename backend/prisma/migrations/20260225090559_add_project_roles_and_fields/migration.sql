-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('USD', 'EURO', 'GBP');

-- CreateEnum
CREATE TYPE "public"."Transport" AS ENUM ('FLY', 'DRIVE', 'TRAIN');

-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "contingencyBudgetPct" DOUBLE PRECISION,
ADD COLUMN     "currency" "public"."Currency" DEFAULT 'USD',
ADD COLUMN     "destinationAirport" TEXT,
ADD COLUMN     "hotelQuality" INTEGER,
ADD COLUMN     "jobSiteAddress" TEXT,
ADD COLUMN     "originAddress" TEXT,
ADD COLUMN     "originAirport" TEXT,
ADD COLUMN     "transport" "public"."Transport",
ADD COLUMN     "workSaturday" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workSunday" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."ProjectRole" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hourlyRateCents" INTEGER NOT NULL,
    "perDiemCents" INTEGER NOT NULL,
    "hotelRoomSharing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectRole_projectId_idx" ON "public"."ProjectRole"("projectId");

-- AddForeignKey
ALTER TABLE "public"."ProjectRole" ADD CONSTRAINT "ProjectRole_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
