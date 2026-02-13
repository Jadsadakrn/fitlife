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

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: "8h",
  });

  res.json({ token });
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
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
    const programs = await prisma.program.findMany();
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
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

app.get("/api/programs/:id/days", async (req, res) => {
  try {
    const programId = req.params.id;

    const days = await prisma.programDay.findMany({
      where: { programId },
      orderBy: { dayNumber: "asc" }
    });

    res.json(days);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch program days" });
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
