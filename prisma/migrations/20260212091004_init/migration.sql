/*
  Warnings:

  - You are about to drop the column `createAt` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "createAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resetPasswordExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetPasswordToken" TEXT;
