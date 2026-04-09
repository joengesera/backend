import { z } from "zod";

const workStatus = z.enum(["PLANNED", "SUBMITTED", "GRADED", "CANCELLED"]);

export const createWorkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: workStatus.optional(),
  dueDate: z.string().or(z.date()).optional(),
  submittedAt: z.string().or(z.date()).optional(),
  gradedAt: z.string().or(z.date()).optional(),
  pointsEarned: z.number().min(0).optional(),
  pointsPossible: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).optional(),
  comment: z.string().optional(),
  courseId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  workTypeId: z.string().uuid().optional(),
  workTypeLabel: z.string().min(1).max(60).optional(),
  localId: z.string().optional()
});

export const updateWorkSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: workStatus.optional(),
  dueDate: z.string().or(z.date()).nullable().optional(),
  submittedAt: z.string().or(z.date()).nullable().optional(),
  gradedAt: z.string().or(z.date()).nullable().optional(),
  pointsEarned: z.number().min(0).nullable().optional(),
  pointsPossible: z.number().positive().optional(),
  percentage: z.number().min(0).max(100).nullable().optional(),
  comment: z.string().nullable().optional(),
  eventId: z.string().uuid().nullable().optional(),
  workTypeId: z.string().uuid().nullable().optional(),
  workTypeLabel: z.string().min(1).max(60).nullable().optional(),
  localId: z.string().nullable().optional()
});
