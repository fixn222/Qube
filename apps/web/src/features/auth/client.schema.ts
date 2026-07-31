import { z } from "zod";
import type { LoginInput, RegisterInput } from "@qube/types";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "password is required"),
}) satisfies z.ZodType<LoginInput>;

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
}) satisfies z.ZodType<RegisterInput>;
