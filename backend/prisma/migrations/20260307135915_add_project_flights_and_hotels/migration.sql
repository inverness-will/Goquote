-- CreateTable
CREATE TABLE "ProjectFlight" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "airline" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "numberOfChanges" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectHotel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectHotel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectFlight_projectId_idx" ON "ProjectFlight"("projectId");

-- CreateIndex
CREATE INDEX "ProjectHotel_projectId_idx" ON "ProjectHotel"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectFlight" ADD CONSTRAINT "ProjectFlight_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectHotel" ADD CONSTRAINT "ProjectHotel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
