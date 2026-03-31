-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PLANNED', 'SUBMITTED', 'GRADED', 'CANCELLED');

-- AlterTable
ALTER TABLE "events" DROP COLUMN IF EXISTS "isWorkItem",
DROP COLUMN IF EXISTS "workTypeLabel";

-- AlterTable
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "workId" TEXT;

-- CreateTable
CREATE TABLE "works" (
    "id" TEXT NOT NULL,
    "localId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkStatus" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "pointsEarned" DOUBLE PRECISION,
    "pointsPossible" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "percentage" DOUBLE PRECISION,
    "comment" TEXT,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "eventId" TEXT,
    "workTypeId" TEXT,
    "workTypeLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "lastModifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "works_localId_key" ON "works"("localId");
CREATE INDEX "works_userId_courseId_idx" ON "works"("userId", "courseId");
CREATE INDEX "works_userId_dueDate_idx" ON "works"("userId", "dueDate");
CREATE INDEX "works_userId_status_idx" ON "works"("userId", "status");
CREATE INDEX "works_userId_syncStatus_idx" ON "works"("userId", "syncStatus");
CREATE INDEX "works_courseId_workTypeId_idx" ON "works"("courseId", "workTypeId");
CREATE INDEX "grades_userId_workId_idx" ON "grades"("userId", "workId");

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "works" ADD CONSTRAINT "works_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "works" ADD CONSTRAINT "works_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "works" ADD CONSTRAINT "works_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "course_work_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "grades" ADD CONSTRAINT "grades_workId_fkey" FOREIGN KEY ("workId") REFERENCES "works"("id") ON DELETE SET NULL ON UPDATE CASCADE;
