require("dotenv").config();
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use(cors());
app.use(helmet());

const JWT_SECRET = process.env.JWT_SECRET;

// REGISTER
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
    });
    res.json({ message: "User created", userId: user.id });
  } catch (error) {
    res.status(400).json({ error: "Email already exists" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.json({ token });
});

app.get("/", (req, res) => {
  res.send("FitLife API is running 🚀");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

app.get("/api/me", authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, createdAt: true }
  });
  res.json(user);
});

// ===============================
// WORKOUT LOG
// ===============================
app.post("/api/workout-log", authenticateToken, async (req, res) => {
  const { date, title } = req.body;

  if (!date || !title) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const log = await prisma.workoutLog.create({
      data: {
        userId: req.user.userId,
        date: new Date(date),
        note: title
      }
    });
    res.json({ success: true, log });
  } catch (err) {
    if (err.code === "P2002") {
      return res.json({ success: true, message: "Already logged" });
    }
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/workout-log", authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.workoutLog.findMany({
      where: { userId: req.user.userId },
      orderBy: { date: "desc" }
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ===============================
// PROGRAMS
// ===============================
app.get("/api/programs", async (req, res) => {
  try {
    const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });
    res.json(programs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch programs" });
  }
});

app.get("/api/programs/:id/days/:day", async (req, res) => {
  try {
    const programId = req.params.id;
    const dayNumber = parseInt(req.params.day);

    const dayInfo = await prisma.programDay.findFirst({
      where: { programId, dayNumber }
    });

    const workouts = await prisma.programWorkout.findMany({
      where: { programId, dayNumber },
      orderBy: { sequence: "asc" },
      include: { gymWorkout: true, homeWorkout: true }
    });

    res.json({ dayInfo, workouts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load program day" });
  }
});

app.get("/api/programs/:id/days/:day/workouts", async (req, res) => {
  try {
    const programId = req.params.id;
    const dayNumber = parseInt(req.params.day);

    const workouts = await prisma.programWorkout.findMany({
      where: { programId, dayNumber },
      orderBy: { sequence: "asc" },
      include: { gymWorkout: true, homeWorkout: true },
    });

    res.json(workouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch workouts" });
  }
});

// ===============================
// EXERCISES & FOODS
// ===============================
app.get("/api/exercises", async (req, res) => {
  const exercises = await prisma.exercise.findMany({ orderBy: { id: "asc" } });
  res.json(exercises);
});

app.get("/api/foods", async (req, res) => {
  const foods = await prisma.food.findMany({ orderBy: { nameTh: "asc" } });
  res.json(foods);
});

// ===============================
// ACTIVITIES
// ===============================
app.post("/api/my-activities", authenticateToken, async (req, res) => {
  const { type, note } = req.body;

  if (!type) {
    return res.status(400).json({ error: "Type is required" });
  }

  try {
    const activity = await prisma.activity.create({
      data: { type, note, userId: req.user.userId },
    });
    res.json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

app.get("/api/my-activities", authenticateToken, async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// ===============================
// MEAL LOG
// ===============================
app.post("/api/log-meal", authenticateToken, async (req, res) => {
  const { foodId, mealType } = req.body;
  const userId = req.user.userId;

  try {
    const log = await prisma.mealLog.create({
      data: { userId, foodId, mealType, date: new Date() }
    });
    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/log-meal/today", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);

  try {
    const logs = await prisma.mealLog.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { food: true }
    });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// PROFILE (GET + PUT)
// ===============================
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, email: true, name: true, age: true, gender: true,
        weight: true, height: true, goal: true, focus: true, level: true,
        tdee: true, protein: true, carbs: true, fat: true, bmi: true,
        startDate: true, duration: true, equipment: true
      }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/profile", authenticateToken, async (req, res) => {
  const { name, age, gender, weight, height, goal, focus, level, tdee, protein, carbs, fat, bmi, startDate, duration, equipment } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name, age, gender, weight, height, goal, focus, level,
        tdee, protein, carbs, fat, bmi,
        startDate: startDate ? new Date(startDate) : undefined,
        duration: duration ? parseInt(duration) : undefined,
        equipment: equipment || undefined
      },
      select: {
        id: true, email: true, name: true, age: true, gender: true,
        weight: true, height: true, goal: true, focus: true, level: true,
        tdee: true, protein: true, carbs: true, fat: true, bmi: true,
        startDate: true, duration: true, equipment: true
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// CHANGE PASSWORD
// ===============================
app.put("/api/change-password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "กรุณากรอกรหัสผ่านให้ครบ" });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.userId }, data: { password: hashed } });
    res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// WORKOUT HISTORY
// ===============================
app.get("/api/workout-history", authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.workoutLog.findMany({
      where: { userId: req.user.userId },
      orderBy: { date: "desc" },
      take: 50
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// TODAY WORKOUT
// ===============================
// Day plan mapping: goal -> focus -> dayNumber -> bodyParts[]
const DAY_PLAN = {
  "build-muscle": {
    "chest-arms": {
      1: ["Chest", "Arms"],
      2: ["Back", "Abs"],
      3: ["Legs"],
      4: "rest",
      5: ["Shoulder", "Arms"],
      6: ["Chest", "Back"],
      7: "rest"
    },
    "legs-core": {
      1: ["Legs"],
      2: ["Abs", "Back"],
      3: ["Chest", "Shoulder"],
      4: "rest",
      5: ["Legs"],
      6: ["Abs", "Full Body"],
      7: "rest"
    },
    "full-body": {
      1: ["Chest", "Back"],
      2: ["Legs", "Abs"],
      3: ["Shoulder", "Arms"],
      4: "rest",
      5: ["Full Body"],
      6: ["Chest", "Legs"],
      7: "rest"
    }
  },
  "build-muscle-female": {
    "chest-arms": {
      1: ["Legs"],
      2: ["Abs", "Arms"],
      3: ["Legs"],
      4: "rest",
      5: ["Full Body"],
      6: ["Abs", "Legs"],
      7: "rest"
    },
    "legs-core": {
      1: ["Legs"],
      2: ["Abs"],
      3: ["Legs"],
      4: "rest",
      5: ["Abs", "Legs"],
      6: ["Full Body"],
      7: "rest"
    },
    "full-body": {
      1: ["Legs", "Abs"],
      2: ["Full Body"],
      3: ["Legs"],
      4: "rest",
      5: ["Abs", "Legs"],
      6: ["Full Body"],
      7: "rest"
    }
  },
  "lose-fat": {
    "chest-arms": {
      1: ["Cardio", "Chest"],
      2: ["Arms", "Abs"],
      3: ["Full Body"],
      4: "rest",
      5: ["Cardio", "Back"],
      6: ["Chest", "Arms"],
      7: "rest"
    },
    "legs-core": {
      1: ["Cardio", "Legs"],
      2: ["Abs", "Back"],
      3: ["Full Body"],
      4: "rest",
      5: ["Cardio", "Legs"],
      6: ["Abs", "Full Body"],
      7: "rest"
    },
    "full-body": {
      1: ["Cardio", "Full Body"],
      2: ["Abs", "Back"],
      3: ["Full Body"],
      4: "rest",
      5: ["Cardio"],
      6: ["Full Body"],
      7: "rest"
    }
  },
  "maintain": {
    "chest-arms": {
      1: ["Full Body"],
      2: ["Chest", "Arms"],
      3: ["Legs", "Abs"],
      4: "rest",
      5: ["Full Body"],
      6: ["Cardio", "Abs"],
      7: "rest"
    },
    "legs-core": {
      1: ["Full Body"],
      2: ["Legs", "Abs"],
      3: ["Back", "Shoulder"],
      4: "rest",
      5: ["Full Body"],
      6: ["Cardio", "Abs"],
      7: "rest"
    },
    "full-body": {
      1: ["Full Body"],
      2: ["Cardio", "Abs"],
      3: ["Full Body"],
      4: "rest",
      5: ["Full Body"],
      6: ["Cardio"],
      7: "rest"
    }
  }
};

const REPS_BY_LEVEL = {
  male: {
    easy:   { sets: 3, reps: 10 },
    medium: { sets: 3, reps: 12 },
    hard:   { sets: 4, reps: 12 }
  },
  female: {
    easy:   { sets: 3, reps: 13 },
    medium: { sets: 3, reps: 15 },
    hard:   { sets: 4, reps: 15 }
  }
};

const COUNT_BY_LEVEL = { easy: 4, medium: 5, hard: 7 };

app.get("/api/today-workout", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { goal: true, focus: true, level: true, startDate: true, duration: true, equipment: true, gender: true }
    });

    if (!user || !user.startDate) {
      return res.json({ isRestDay: false, dayNumber: 1, exercises: [], noProgram: true });
    }

    // คำนวณ Day ปัจจุบัน
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(user.startDate);
    start.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    const totalDays = user.duration || 30;

    // เกินระยะเวลาโปรแกรมแล้ว
    if (diffDays >= totalDays) {
      return res.json({ isRestDay: false, dayNumber: null, exercises: [], programDone: true, totalDays });
    }

    const dayInCycle = (diffDays % 7) + 1; // 1-7

    const goal = user.goal || "lose-fat";
    const focus = user.focus || "full-body";
    const level = user.level || "easy";
    const gender = user.gender || "male";

    // เลือก plan ตาม goal + gender
    let planKey = goal;
    if (goal === "build-muscle" && gender === "female") {
      planKey = "build-muscle-female";
    }

    const planForGoal = DAY_PLAN[planKey] || DAY_PLAN["lose-fat"];
    const planForFocus = planForGoal[focus] || planForGoal["full-body"];
    const todayPlan = planForFocus[dayInCycle];

    if (todayPlan === "rest") {
      return res.json({ isRestDay: true, dayNumber: dayInCycle, daysLeft: totalDays - diffDays });
    }

    // ดึงท่าออกกำลังกาย
    const count = COUNT_BY_LEVEL[level] || 5;
    const genderReps = REPS_BY_LEVEL[gender] || REPS_BY_LEVEL.male;
    const reps = genderReps[level] || genderReps.medium;
    const bodyParts = todayPlan;
    const userEquipment = user.equipment || "gym";

    // equipment filter: gym = Gym + Bodyweight, bodyweight = Bodyweight + No Equipment
    const equipmentList = userEquipment === "gym"
      ? ["Gym", "Bodyweight", "No Equipment"]
      : ["Bodyweight", "No Equipment"];

    // แบ่งจำนวนท่าตาม bodyPart
    const perPart = Math.ceil(count / bodyParts.length);
    let exercises = [];

    // cascade level: ดึงตาม level ก่อน ถ้าไม่พอดึง level ต่ำกว่าเติม
    const levelCascade = level === "hard"   ? ["Hard", "Medium", "Easy"]
                       : level === "medium" ? ["Medium", "Easy"]
                       : ["Easy"];

    for (const part of bodyParts) {
      let partExercises = [];
      for (const lvl of levelCascade) {
        if (partExercises.length >= perPart) break;
        const found = await prisma.exercise.findMany({
          where: {
            bodyPart: part,
            level: { equals: lvl, mode: "insensitive" },
            equipment: { in: equipmentList },
            id: { notIn: [...exercises.map(e => e.id), ...partExercises.map(e => e.id)] }
          },
          take: perPart - partExercises.length
        });
        partExercises = partExercises.concat(found);
      }
      exercises = exercises.concat(partExercises);
    }

    // ตัดให้พอดีจำนวน
    exercises = exercises.slice(0, count);

    res.json({
      isRestDay: false,
      dayNumber: dayInCycle,
      daysLeft: totalDays - diffDays,
      dayProgress: diffDays + 1,
      totalDays,
      bodyParts,
      sets: reps.sets,
      reps: reps.reps,
      exercises
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// MEAL HISTORY
// ===============================
app.get("/api/meal-history", authenticateToken, async (req, res) => {
  try {
    const logs = await prisma.mealLog.findMany({
      where: { userId: req.user.userId },
      orderBy: { date: "desc" },
      take: 100,
      include: { food: true }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
