const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const csv = require("csv-parser");

async function main() {
    console.log("🌱 Start seeding...");

    // 1. Seed Programs
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

// ฟังก์ชันล้างข้อมูลตามลำดับความสัมพันธ์ (ป้องกัน P2003)
async function clearAllData() {
    console.log("🧹 Cleaning old data...");
    await prisma.mealLog.deleteMany();
    await prisma.workoutLog.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.programWorkout.deleteMany();
    await prisma.programDay.deleteMany();
    // ค่อยลบตารางหลัก
    await prisma.food.deleteMany();
    await prisma.exercise.deleteMany();
    await prisma.program.deleteMany();
    await prisma.focus.deleteMany();
}

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
                } catch (err) { reject(err); }
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
                } catch (err) { reject(err); }
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
                    await prisma.programWorkout.createMany({
                        data: results.map(row => ({
                            programId: row.program_id?.trim(),
                            dayNumber: parseInt(row.day_number),
                            sequence: parseInt(row.sequence),
                            gymWorkoutId: row.gym_workout_id && row.gym_workout_id.trim() !== "-" ? row.gym_workout_id.trim() : null,
                            homeWorkoutId: row.home_workout_id && row.home_workout_id.trim() !== "-" ? row.home_workout_id.trim() : null,
                            repsInfo: row.reps_info?.trim(),
                        })),
                        skipDuplicates: true,
                    });
                    console.log("✅ ProgramWorkout seeded");
                    resolve();
                } catch (err) { reject(err); }
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
                    // 🛠 ล้างข้อมูลที่เกี่ยวข้องออกก่อนเพื่อไม่ให้ติด Error
                    await prisma.mealLog.deleteMany(); 
                    await prisma.food.deleteMany(); 

                    await prisma.food.createMany({
                        data: results.map(row => ({
                            nameTh: row.name_th.trim(),
                            calories: parseInt(row.calories_kcal) || 0,
                            protein: parseInt(row.protein_g) || 0,
                            carbs: parseInt(row.carbs_g) || 0,
                            fat: parseInt(row.fat_g) || 0,
                            imageUrl: row.image_url.trim() || "",
                            category: row.category ? row.category.trim() : "ทั่วไป"
                        })),
                    });
                    console.log("✅ Food seeded");
                    resolve();
                } catch (err) { reject(err); }
            });
    });
}

async function seedFocus() {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream("prisma/focus_program.csv")
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", async () => {
                try {
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
                } catch (err) { reject(err); }
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