-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'EXAMEN';
ALTER TYPE "EventType" ADD VALUE 'INTERRO';
ALTER TYPE "EventType" ADD VALUE 'TP';
ALTER TYPE "EventType" ADD VALUE 'AUTRE';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "isWorkItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "workTypeLabel" TEXT;

-- AlterTable
ALTER TABLE "grades" ADD COLUMN     "percentage" DOUBLE PRECISION,
ADD COLUMN     "workTypeLabel" TEXT;

-- CreateIndex
CREATE INDEX "TaskSession_taskId_idx" ON "TaskSession"("taskId");

-- CreateIndex
CREATE INDEX "tasks_userId_eventId_idx" ON "tasks"("userId", "eventId");

-- CreateIndex
CREATE INDEX "tasks_eventId_position_idx" ON "tasks"("eventId", "position");

-- AddForeignKey
ALTER TABLE "TaskSession" ADD CONSTRAINT "TaskSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
