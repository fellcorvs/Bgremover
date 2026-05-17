import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and number"
    ),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const uploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) =>
      ["image/png", "image/jpeg", "image/webp", "image/jpg"].includes(
        file.type
      ),
    "Invalid file type"
  ),
});

export const bulkUploadSchema = z.object({
  files: z
    .array(z.instanceof(File))
    .min(1, "At least one file is required")
    .max(20, "Maximum 20 files per batch")
    .refine(
      (files) =>
        files.every((f) =>
          ["image/png", "image/jpeg", "image/webp", "image/jpg"].includes(
            f.type
          )
        ),
      "Invalid file type detected"
    ),
});

export const backgroundOptionsSchema = z.object({
  type: z.enum(["transparent", "color", "blur", "image"]),
  color: z.string().optional(),
  blurRadius: z.number().min(0).max(50).optional(),
  imageUrl: z.string().url().optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  image: z.string().url().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BackgroundOptionsInput = z.infer<typeof backgroundOptionsSchema>;
