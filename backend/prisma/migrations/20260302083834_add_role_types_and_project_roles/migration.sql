-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "roles" JSONB;

-- CreateTable
CREATE TABLE "public"."RoleType" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hourlyRateCents" INTEGER NOT NULL,
    "perDiemCents" INTEGER NOT NULL,
    "hotelSoloRoom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoleType_userId_idx" ON "public"."RoleType"("userId");

-- AddForeignKey
ALTER TABLE "public"."RoleType" ADD CONSTRAINT "RoleType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
