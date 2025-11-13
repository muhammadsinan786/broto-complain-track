import { z } from "zod";

// Complaint validation schema
export const complaintSchema = z.object({
  title: z.string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(2000, "Description must be less than 2000 characters"),
  category: z.enum(["academic", "infrastructure", "technical", "administrative", "other"]),
  priority: z.enum(["low", "medium", "high"]),
  is_anonymous: z.boolean()
});

// File validation
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES = 5;
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export const validateFiles = (files: FileList | null): { valid: boolean; error?: string } => {
  if (!files || files.length === 0) return { valid: true };
  
  if (files.length > MAX_FILES) {
    return { valid: false, error: `Maximum ${MAX_FILES} files allowed` };
  }
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File "${file.name}" exceeds 10MB limit` };
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { valid: false, error: `File type "${file.type}" not allowed for "${file.name}"` };
    }
  }
  
  return { valid: true };
};

// Message validation schema
export const messageSchema = z.object({
  message: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message must be less than 2000 characters")
});

// Auth validation schemas
export const signUpSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number")
});

export const signInSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(1, "Password is required")
});

// Rating validation schema
export const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string()
    .trim()
    .max(500, "Feedback must be less than 500 characters")
    .optional()
});
