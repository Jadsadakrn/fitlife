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
        tdee: true, protein: true, carbs: true, fat: true, bmi: true
      }
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/profile", authenticateToken, async (req, res) => {
  const { name, age, gender, weight, height, goal, focus, level, tdee, protein, carbs, fat, bmi } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name, age, gender, weight, height, goal, focus, level, tdee, protein, carbs, fat, bmi },
      select: {
        id: true, email: true, name: true, age: true, gender: true,
        weight: true, height: true, goal: true, focus: true, level: true,
        tdee: true, protein: true, carbs: true, fat: true, bmi: true
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
