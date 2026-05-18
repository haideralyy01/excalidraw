import "dotenv/config";
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prismaClient } from "@repo/db/client";
import { CreateUserSchema, LoginUserSchema, RoomSchema, getValidationMessage } from "@repo/common/schema";
import { JWT_SECRET } from '@repo/backend-common/config';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});