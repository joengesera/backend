import { Prisma } from '@prisma/client';

export enum ProfessorAction {
  UPDATE_GRADE = 'UPDATE_GRADE',
  UPDATE_SCHEDULE = 'UPDATE_SCHEDULE',
  ASSIGN_COURSE = 'ASSIGN_COURSE'
}

export interface UpdateGradeDTO {
  gradeId?: string;
  studentId: string;
  courseId: string;
  workId?: string;
  score: number;
  maxScore?: number;
  percentage?: number;
  comment?: string;
  name?: string;
  date?: string | Date;
}

export interface EventUpdatePayload {
  id: string;
  title?: string;
  description?: string;
  location?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  isAllDay?: boolean;
  recurrence?: string;
  type?: string;
}

export interface UpdateScheduleDTO {
  courseId: string;
  events: EventUpdatePayload[];
}

export interface GradeResponse {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  percentage: number | null;
  comment: string | null;
  workId: string | null;
  work: any | null;
  workType: any | null;
  date: Date | null;
  updatedAt: Date;
}

export interface ProfessorAssignmentResponse {
  id: string;
  userId: string;
  courses: any[];
}
