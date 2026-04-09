import { z } from 'zod';

export const updateGradeSchema = z.object({
  gradeId: z.string().uuid().optional(),
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  workId: z.string().uuid().optional(),
  score: z.number().min(0),
  maxScore: z.number().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
  comment: z.string().max(500).optional(),
  name: z.string().max(100).optional(),
  date: z.string().or(z.date()).optional()
});

export const updateScheduleSchema = z.object({
  courseId: z.string().uuid(),
  events: z.array(z.object({
    id: z.string().uuid(),
    title: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).optional(),
    isAllDay: z.boolean().optional(),
    recurrence: z.string().optional(),
    type: z.string().optional()
  }))
});

export const assignCourseSchema = z.object({
  courseId: z.string().uuid()
});
