-- AlterTable
ALTER TABLE "ProgramWorkout" ALTER COLUMN "gymWorkoutId" DROP NOT NULL,
ALTER COLUMN "homeWorkoutId" DROP NOT NULL,
ALTER COLUMN "repsInfo" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ProgramWorkout" ADD CONSTRAINT "ProgramWorkout_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramWorkout" ADD CONSTRAINT "ProgramWorkout_gymWorkoutId_fkey" FOREIGN KEY ("gymWorkoutId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramWorkout" ADD CONSTRAINT "ProgramWorkout_homeWorkoutId_fkey" FOREIGN KEY ("homeWorkoutId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
