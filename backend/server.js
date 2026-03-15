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

// ✅ API สำหรับรีเซ็ตรหัสผ่าน (Reset Password)
app.post('/api/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        // 1. เช็คว่ามี User ไหม
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'ไม่พบอีเมลนี้ในระบบ' });
        }

        // 2. Hash รหัสผ่านใหม่
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 3. อัปเดตลงฐานข้อมูล
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จแล้ว ✅' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดที่ Server' });
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
  const { date, title, exerciseId, sets, reps, duration, note } = req.body;
  if (!date) return res.status(400).json({ error: "Missing date" });

  try {
    // 🔥 เช็คซ้ำ
    if (exerciseId) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await prisma.workoutLog.findFirst({
        where: {
          userId: req.user.userId,
          exerciseId,
          date: { gte: startOfDay, lte: endOfDay }
        }
      });

      if (existing) {
        return res.json({ success: true, log: existing, duplicate: true });
      }
    }

    const log = await prisma.workoutLog.create({
      data: {
        userId: req.user.userId,
        exerciseId: exerciseId || null,
        date: new Date(date),
        sets: sets ? parseInt(sets) : null,
        reps: reps ? parseInt(reps) : null,
        duration: duration ? parseInt(duration) : null,
        note: note || title || null
      }
    });
    res.json({ success: true, log });
  } catch (err) {
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
      take: 50,
      include: { exercise: true } // 🔥 เพิ่มตรงนี้
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// TODAY WORKOUT CONFIGURATION
// ===============================

const DAY_PLAN = {
  "build-muscle": {
    "chest-arms": { 1: ["Chest", "Arms"], 2: ["Back", "Abs"], 3: ["Legs"], 4: "rest", 5: ["Shoulder", "Arms"], 6: ["Chest", "Back"], 7: "rest" },
    "legs-core": { 1: ["Legs"], 2: ["Abs", "Back"], 3: ["Chest", "Shoulder"], 4: "rest", 5: ["Legs"], 6: ["Abs", "Full Body"], 7: "rest" },
    "full-body": { 1: ["Chest", "Back"], 2: ["Legs", "Abs"], 3: ["Shoulder", "Arms"], 4: "rest", 5: ["Full Body"], 6: ["Chest", "Legs"], 7: "rest" }
  },
  "build-muscle-female": {
    "chest-arms": { 1: ["Legs"], 2: ["Abs", "Arms"], 3: ["Legs"], 4: "rest", 5: ["Full Body"], 6: ["Abs", "Legs"], 7: "rest" },
    "legs-core": { 1: ["Legs"], 2: ["Abs"], 3: ["Legs"], 4: "rest", 5: ["Abs", "Legs"], 6: ["Full Body"], 7: "rest" },
    "full-body": { 1: ["Legs", "Abs"], 2: ["Full Body"], 3: ["Legs"], 4: "rest", 5: ["Abs", "Legs"], 6: ["Full Body"], 7: "rest" }
  },
  "lose-fat": { // ของผู้ชาย: เน้นทั่วร่างสลับคาดิโอ + ท้อง
    "full-body": { 1: ["Cardio", "Full Body", "Abs"], 2: ["Abs", "Back", "Legs"], 3: ["Cardio", "Full Body", "Abs"], 4: "rest", 5: ["Cardio", "Abs", "Arms"], 6: ["Full Body", "Abs", "Cardio"], 7: "rest" }
  },
  "lose-fat-female": { // ของผู้หญิง: เน้นขา ก้น ร่อง11 (ท้อง)
    "full-body": { 1: ["Cardio", "Legs", "Abs"], 2: ["Abs", "Full Body", "Cardio"], 3: ["Legs", "Cardio", "Abs"], 4: "rest", 5: ["Cardio", "Abs", "Full Body"], 6: ["Legs", "Abs", "Cardio"], 7: "rest" }
  },
  "maintain": {
    "chest-arms": { 1: ["Full Body"], 2: ["Chest", "Arms"], 3: ["Legs", "Abs"], 4: "rest", 5: ["Full Body"], 6: ["Cardio", "Abs"], 7: "rest" },
    "legs-core": { 1: ["Full Body"], 2: ["Legs", "Abs"], 3: ["Back", "Shoulder"], 4: "rest", 5: ["Full Body"], 6: ["Cardio", "Abs"], 7: "rest" },
    "full-body": { 1: ["Full Body"], 2: ["Cardio", "Abs"], 3: ["Full Body"], 4: "rest", 5: ["Full Body"], 6: ["Cardio"], 7: "rest" }
  }
};

const REPS_BY_LEVEL = {
  male: {
    easy:   { sets: 3, reps: 10, timeReps: 40 },
    medium: { sets: 3, reps: 12, timeReps: 45 },
    hard:   { sets: 4, reps: 15, timeReps: 60 }
  },
  female: {
    easy:   { sets: 2, reps: 10, timeReps: 30 },
    medium: { sets: 3, reps: 12, timeReps: 40 },
    hard:   { sets: 4, reps: 15, timeReps: 45 }
  }
};

// ตารางจำนวนท่าที่คุณต้องการ
const EXERCISE_COUNT = {
  "build-muscle": {
    male:   { easy: 4, medium: 5, hard: 7 },
    female: { easy: 4, medium: 5, hard: 6 }
  },
  "lose-fat": {
    male:   { easy: 5, medium: 6, hard: 8 },
    female: { easy: 4, medium: 5, hard: 7 } 
  },
  "maintain": {
    male:   { easy: 4, medium: 5, hard: 6 },
    female: { easy: 4, medium: 5, hard: 6 }
  }
};

// ===============================
// API ROUTE
// ===============================

app.get("/api/today-workout", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { goal: true, focus: true, level: true, startDate: true, duration: true, equipment: true, gender: true }
    });

    if (!user || !user.startDate) {
      return res.json({ isRestDay: false, dayNumber: 1, exercises: [], noProgram: true });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(user.startDate);
    start.setHours(0, 0, 0, 0);
    
    let diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) diffDays = 0; 

    const totalDays = user.duration || 30;
    if (diffDays >= totalDays) {
      return res.json({ isRestDay: false, dayNumber: null, exercises: [], programDone: true, totalDays });
    }

    const dayInCycle = (diffDays % 7) + 1; 

    let goal = user.goal || "lose-fat";
    let focus = user.focus || "full-body";
    let level = user.level || "easy";
    let gender = user.gender || "male";
    let userEquipment = user.equipment || "gym";

    // 🛑 บังคับล็อกสเปคสำหรับสายลดไขมัน
    if (goal === "lose-fat") {
      focus = "full-body";
      userEquipment = "bodyweight"; 
    }

    // เลือกระบบ ชาย/หญิง
    let planKey = goal;
    if (gender === "female") {
      if (goal === "build-muscle") planKey = "build-muscle-female";
      if (goal === "lose-fat") planKey = "lose-fat-female";
    }

    const planForGoal = DAY_PLAN[planKey] || DAY_PLAN["lose-fat"];
    const planForFocus = planForGoal[focus] || planForGoal["full-body"];
    const todayPlan = planForFocus[dayInCycle];

    if (todayPlan === "rest") {
      return res.json({ isRestDay: true, dayNumber: dayInCycle, daysLeft: totalDays - diffDays });
    }

    // ดึงจำนวนท่าและ Reps/Sets
    const count = EXERCISE_COUNT[goal]?.[gender]?.[level] || 5;
    const genderReps = REPS_BY_LEVEL[gender] || REPS_BY_LEVEL.male;
    const levelReps = genderReps[level] || genderReps.medium;
    
    const isTime = goal === "lose-fat";
    const finalReps = isTime ? levelReps.timeReps : levelReps.reps;

    const bodyParts = todayPlan;
    
    // 🛑 Priority อุปกรณ์: หา Gym ให้เกลี้ยงก่อนค่อยไป Bodyweight
    const equipPriority = userEquipment === "gym"
      ? [["Gym", "gym"], ["Bodyweight", "No Equipment", "bodyweight", "no equipment"]]
      : [["Bodyweight", "No Equipment", "bodyweight", "no equipment"]];

    const perPart = Math.ceil(count / bodyParts.length);
    let exercises = [];

    // ลำดับความยากแบบยืดหยุ่น (Cascade)
    const levelCascade = level === "hard"   ? ["Hard", "Medium", "Easy", "hard", "medium", "easy"]
                       : level === "medium" ? ["Medium", "Easy", "Hard", "medium", "easy", "hard"]
                       : ["Easy", "Medium", "easy", "medium"]; 

    // วนลูปหาท่าตามส่วนร่างกายและลำดับอุปกรณ์/ความยาก
    for (const part of bodyParts) {
      let partExercises = [];
      const partSearch = [part, part.toLowerCase(), part.toUpperCase()];

      for (const eqList of equipPriority) {
        if (partExercises.length >= perPart) break;
        for (const lvl of levelCascade) {
          if (partExercises.length >= perPart) break;
          const found = await prisma.exercise.findMany({
            where: {
              bodyPart: { in: partSearch },
              level: { in: [lvl] },
              equipment: { in: eqList },
              id: { notIn: [...exercises.map(e => e.id), ...partExercises.map(e => e.id)] }
            },
            take: perPart - partExercises.length
          });
          partExercises = partExercises.concat(found);
        }
      }
      exercises = exercises.concat(partExercises);
    }

    // 🚀 Fallback สุดท้าย: ถ้ายังไม่ครบ ให้ดึง Cardio หรือ ท้อง มาอุดช่องโหว่ (โดยไล่ Gym ก่อนเหมือนเดิม)
    if (exercises.length < count) {
      const shortfall = count - exercises.length;
      let fillEx = [];
      for (const eqList of equipPriority) {
        if (fillEx.length >= shortfall) break;
        for (const lvl of levelCascade) {
          if (fillEx.length >= shortfall) break;
          const found = await prisma.exercise.findMany({
            where: {
              bodyPart: { in: ["Cardio", "Abs", "cardio", "abs", "CARDIO", "ABS"] },
              level: { in: [lvl] },
              equipment: { in: eqList },
              id: { notIn: [...exercises.map(e => e.id), ...fillEx.map(e => e.id)] }
            },
            take: shortfall - fillEx.length
          });
          fillEx = fillEx.concat(found);
        }
      }
      exercises = exercises.concat(fillEx);
    }

    exercises = exercises.slice(0, count);

    res.json({
      isRestDay: false,
      dayNumber: dayInCycle,
      daysLeft: totalDays - diffDays,
      dayProgress: diffDays + 1,
      totalDays,
      bodyParts,
      sets: levelReps.sets,
      reps: finalReps,
      isTime: isTime,
      exercises
    });

  } catch (err) {
    console.error("Today Workout Error:", err);
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
