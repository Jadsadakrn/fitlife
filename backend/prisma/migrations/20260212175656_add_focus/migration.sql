-- CreateTable
CREATE TABLE "Focus" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "targetGender" TEXT NOT NULL,
    "workoutIds" TEXT NOT NULL,
    "repsInfo" TEXT NOT NULL,

    CONSTRAINT "Focus_pkey" PRIMARY KEY ("id")
);
