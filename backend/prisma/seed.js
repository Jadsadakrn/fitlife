const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Start seeding...");

    // ตัวอย่าง seed Program ก่อน
    await prisma.program.createMany({
        data: [
            { id: "PG01", name: "Fat Loss Beginner" },
            { id: "PG02", name: "Upper Lower Split" },
            { id: "PG03", name: "Classic Split" },
            { id: "PG04", name: "Power Program" },
            { id: "PG05", name: "Hypertrophy Program" },
            { id: "PG06", name: "Classic Bro split" },
            { id: "PG07", name: "Glute Focus Program" },
        ],
        skipDuplicates: true,
    });

    console.log("✅ Program seeded");

    await seedExercises();
    await seedProgramDays();
    await seedProgramWorkouts();
    await seedFocus();
    await seedFoods();
}

const fs = require("fs");
const csv = require("csv-parser");

async function seedExercises() {
    const results = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream("prisma/exercise.csv")
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", async () => {
                try {

                    await prisma.exercise.createMany({
                        data: results.map(row => ({
                            id: row.id,
                            nameEn: row.name_en,
                            nameTh: row.name_th,
                            bodyPart: row.body_part,
                            level: row.level,
                            equipment: row.equipment_type,
                            description: row.description,
                            imageUrl: row.image_url,
                        })),
                        skipDuplicates: true,
                    });

                    console.log("✅ Exercises seeded");
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function seedProgramDays() {
    const results = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream("prisma/program_day.csv")
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", async () => {
                try {
                    console.log("Program IDs in CSV:");
                    console.log([...new Set(results.map(r => r.program_id))]);

                    await prisma.programDay.createMany({
                        data: results.map(row => ({
                            programId: row.program_id.trim(),
                            dayNumber: parseInt(row.day_number),
                            dayTitle: row.day_title?.trim(),
                            focusArea: row.focus_area?.trim(),
                            description: row.description?.trim(),
                        })),
                        skipDuplicates: true,
                    });

                    console.log("✅ ProgramDay seeded");
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function seedProgramWorkouts() {
    const results = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream("prisma/program_workout.csv")
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", async () => {
                try {

                    console.log("Seeding ProgramWorkout...");

                    await prisma.programWorkout.createMany({
                        data: results.map(row => ({
                            programId: row.program_id?.trim(),
                            dayNumber: parseInt(row.day_number),
                            sequence: parseInt(row.sequence),
                            gymWorkoutId:
                                row.gym_workout_id && row.gym_workout_id.trim() !== "-"
                                    ? row.gym_workout_id.trim()
                                    : null,

                            homeWorkoutId:
                                row.home_workout_id && row.home_workout_id.trim() !== "-"
                                    ? row.home_workout_id.trim()
                                    : null,
                            repsInfo: row.reps_info?.trim(),
                        })),
                        skipDuplicates: true,
                    });

                    console.log("✅ ProgramWorkout seeded");
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
    });
}

async function seedFoods() {
  const results = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream("prisma/food.csv")
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {

          console.log("Seeding Food...");

          await prisma.food.createMany({
            data: results.map(row => ({
              nameTh: row.name_th?.trim(),
              calories: parseInt(row.calories_kcal) || 0,
              protein: parseInt(row.protein_g) || 0,
              carbs: parseInt(row.carbs_g) || 0,
              fat: parseInt(row.fat_g) || 0,
              imageUrl: row.image_url?.trim() || "",
            })),
            skipDuplicates: true,
          });

          console.log("✅ Food seeded");
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}



async function seedFocus() {
  const results = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream("prisma/focus_program.csv")  // ✅ แก้ตรงนี้
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {

          console.log("Seeding Focus...");

          await prisma.focus.createMany({
            data: results.map(row => ({
              id: row.focus_id?.trim(),
              nameEn: row.focus_name_en?.trim(),
              nameTh: row.focus_name_th?.trim(),
              targetGender: row.target_gender?.trim(),
              workoutIds: row.workout_ids?.trim(),
              repsInfo: row.reps_info?.trim(),
            })),
            skipDuplicates: true,
          });

          console.log("✅ Focus seeded");
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}



main()
    .then(() => {
        console.log("🌱 Seeding finished.");
        prisma.$disconnect();
    })
    .catch((e) => {
        console.error(e);
        prisma.$disconnect();
        process.exit(1);
    });
