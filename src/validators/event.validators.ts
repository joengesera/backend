import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["CLASS", "EXAM", "EXAMEN", "INTERRO", "TP", "QUIZ", "ASSIGNMENT", "STUDY", "AUTRE", "PERSONAL", "MEETING"]).optional(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  isAllDay: z.boolean().optional(),
  location: z.string().optional(),
  recurrence: z.string().optional(),
  courseId: z.string().uuid().optional(),
  generateDefaultTasks: z.boolean().optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(["CLASS", "EXAM", "EXAMEN", "INTERRO", "TP", "QUIZ", "ASSIGNMENT", "STUDY", "AUTRE", "PERSONAL", "MEETING"]).optional(),
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),
  isAllDay: z.boolean().optional(),
  location: z.string().optional(),
  recurrence: z.string().optional(),
  courseId: z.string().uuid().optional(), // Can move event to another course?
});
