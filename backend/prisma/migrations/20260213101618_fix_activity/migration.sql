/*
  Warnings:

  - You are about to drop the column `action` on the `Activity` table. All the data in the column will be lost.
  - Added the required column `type` to the `Activity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Activity" DROP COLUMN "action",
ADD COLUMN     "note" TEXT,
ADD COLUMN     "type" TEXT NOT NULL;
