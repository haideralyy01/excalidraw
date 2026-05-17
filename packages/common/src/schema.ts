import { z } from "zod";

export const CreateUserSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters long"),
    email: z.string().trim().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const LoginUserSchema = CreateUserSchema.pick({email: true, password: true});

export const RoomSchema = z.object({
    name: z.string(),
});

export function getValidationMessage(error: z.ZodError) {
    return error.issues[0]?.message || "Validation failed";
}