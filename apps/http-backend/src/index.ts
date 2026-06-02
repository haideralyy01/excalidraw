import "dotenv/config";
import express from 'express';
import bcrypt from 'bcrypt';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { prismaClient } from "@repo/db/client";
import { CreateUserSchema, LoginUserSchema, RoomSchema, getValidationMessage } from "@repo/common/schema";
import { JWT_SECRET } from '@repo/backend-common/config';
import { authenticateToken } from "./middleware"

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8000;

const allowedOrigins = [
  "http://localhost:3000",
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.post("/api/v1/signup", async (req, res) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(409).json({message: getValidationMessage(parsed.error)});
  }

  const { name, email, password } = parsed.data;
  try {
    const existingUser = await prismaClient.user.findUnique({ where: {email} });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prismaClient.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    const token = jwt.sign({ userId: newUser.id, email: newUser.email}, JWT_SECRET, { expiresIn: "1h" }
    );
    res.status(201).json({ message: "User created successfully",
      token,
      user: { name: newUser.name, email: newUser.email }
     });
  } catch (e: any) {
    console.error("Error signing up user:", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/v1/login", async (req, res) => {
  const parsed = LoginUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(409).json({message: getValidationMessage(parsed.error)});
  }
  const { email, password } = parsed.data;
  try {
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ message: "Login successful", token, user: { name: user.name, email: user.email } });
  } catch (e: any) {
    console.error("Error logging in user:", e);
    res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/api/v1/room", authenticateToken, async (req, res) => {
  const parsed = RoomSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(409).json({message: getValidationMessage(parsed.error)});
  }
  const { name } = parsed.data;
  const userId = req.userId;
  try {
    const existingRoom = await prismaClient.room.findUnique({ where: { slug: name } });
    if (existingRoom) {
      return res.status(409).json({ message: "Room already exists" });
    }
    const newRoom = await prismaClient.room.create({
      data: {
        slug: name,
        adminId: userId
      },
    });
    res.status(201).json({ message: "Room created successfully", room: { name: newRoom.slug, roomId: newRoom.id } });
  } catch (e: any) {
    console.error("Error creating room:", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/v1/chats/:roomId", async (req, res) => {
  const roomId = Number(req.params.roomId);
  try {
    const chats = await prismaClient.chat.findMany({
      where: { roomId },
      orderBy: { id: "desc" }
    });
    res.status(200).json({ chats: chats });
  } catch (e: any) {
    console.error("Error fetching chats:", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/v1/room/:slug", async (req, res) => {
  const roomName = req.params.slug;
  try {
    const room = await prismaClient.room.findUnique({ where: { slug: roomName }   });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.status(200).json({ room: { name: room.slug, roomId: room.id } });
  } catch (e: any) {
    console.error("Error fetching room:", e);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});