-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "timeSpentMinutes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TaskSession" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
