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

  // ✅ Validation
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

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "8h",
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

app.get("/api/programs", async (req, res) => {
  try {
    const programs = await prisma.program.findMany({
      orderBy: { id: "asc" }
    });
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

    // 1️⃣ ดึงข้อมูลวัน
    const dayInfo = await prisma.programDay.findFirst({
      where: {
        programId,
        dayNumber
      }
    });

    // 2️⃣ ดึง workout พร้อม join exercise
    const workouts = await prisma.programWorkout.findMany({
      where: {
        programId,
        dayNumber
      },
      orderBy: {
        sequence: "asc"
      },
      include: {
        gymWorkout: true,
        homeWorkout: true
      }
    });

    res.json({
      dayInfo,
      workouts
    });

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
      where: {
        programId,
        dayNumber,
      },
      orderBy: {
        sequence: "asc",
      },
      include: {
        gymWorkout: true,
        homeWorkout: true,
      },
    });

    res.json(workouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch workouts" });
  }
});

app.get("/api/exercises", async (req, res) => {
  const exercises = await prisma.exercise.findMany({
    orderBy: { id: "asc" }
  });

  res.json(exercises);
});

app.get("/api/foods", async (req, res) => {
  const foods = await prisma.food.findMany({
    orderBy: { nameTh: "asc" }
  });

  res.json(foods);
});

// ===============================
// CREATE ACTIVITY
// ===============================
app.post("/api/my-activities", authenticateToken, async (req, res) => {
  const { type, note } = req.body;

  if (!type) {
    return res.status(400).json({ error: "Type is required" });
  }

  try {
    const activity = await prisma.activity.create({
      data: {
        type,
        note,
        userId: req.user.userId,
      },
    });

    res.json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

// ===============================
// GET MY ACTIVITIES
// ===============================
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

app.post("/api/workout-log", async (req, res) => {
  const { date, title } = req.body;

  if (!date || !title) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const log = await prisma.workoutLog.create({
      data: { date, title }
    });

    res.json({ success: true, log });

  } catch (err) {

    // 👇 ตรงนี้สำคัญ
    if (err.code === "P2002") {
      return res.json({ success: true, message: "Already logged" });
    }

    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});


