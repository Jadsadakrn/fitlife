/*
  Warnings:

  - A unique constraint covering the columns `[date,title]` on the table `WorkoutLog` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WorkoutLog_date_title_key" ON "WorkoutLog"("date", "title");
