import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.string().or(z.date()).optional(),
  courseId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  durationMinutes: z.number().int().positive().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.string().or(z.date()).optional(),
  courseId: z.string().uuid().optional(),
  eventId: z.string().uuid().nullable().optional(), // Nullable allowing detachment
  durationMinutes: z.number().int().positive().optional(),
});

// For reordering
export const reorderTasksSchema = z.object({
  items: z.array(
    z.object({
      taskId: z.string().uuid(),
      eventId: z.string().uuid().nullable(),
      position: z.number().int().nonnegative(),
    })
  ).min(1),
});
