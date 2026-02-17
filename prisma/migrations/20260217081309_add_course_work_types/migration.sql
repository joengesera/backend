-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('EXAMEN', 'INTERRO', 'PROJET', 'TD', 'TP', 'EXERCICES');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED';

-- AlterTable
ALTER TABLE "grades" ADD COLUMN     "workTypeId" TEXT;

-- CreateTable
CREATE TABLE "course_work_types" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "type" "WorkType" NOT NULL,
    "weightPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_work_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_work_types_courseId_idx" ON "course_work_types"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "course_work_types_courseId_type_key" ON "course_work_types"("courseId", "type");

-- CreateIndex
CREATE INDEX "grades_courseId_workTypeId_idx" ON "grades"("courseId", "workTypeId");

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "course_work_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_work_types" ADD CONSTRAINT "course_work_types_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
