import { db } from '../lib/db';
import { Prisma } from '@prisma/client';

export type GradeWithRelations = any & {
  work?: any | null;
  workType?: any | null;
};

export class ProfessorRepository {
  async findGradeById(id: string) {
    return db.grade.findUnique({
      where: { id },
      include: { work: true }
    });
  }

  async findGradeByWork(userId: string, courseId: string, workId: string) {
    return db.grade.findFirst({
      where: { userId, courseId, workId },
      include: { work: true }
    });
  }

  async findWork(id: string) {
    return db.work.findUnique({
      where: { id }
    });
  }

  async createGrade(data: any) {
    return db.grade.create({
      data,
      include: { work: true }
    });
  }

  async updateGrade(id: string, data: any) {
    return db.grade.update({
      where: { id },
      data,
      include: { work: true }
    });
  }

  async findEvent(id: string) {
    return db.event.findUnique({
      where: { id }
    });
  }

  async updateEvent(id: string, data: any) {
    return db.event.update({
      where: { id },
      data
    });
  }

  async findCourse(id: string) {
    return db.course.findUnique({
      where: { id }
    });
  }

  async findProfessorWithCourses(userId: string) {
    // Return the professor profile linked to the user
    return db.professor.findUnique({
      where: { userId },
      include: { courses: true }
    });
  }

  async assignCourse(professorId: string, courseId: string) {
    return db.professor.update({
      where: { id: professorId },
      data: {
        courses: {
          connect: { id: courseId }
        }
      }
    });
  }

  async listCoursesForProfessor(professorId: string) {
    const professor = await db.professor.findUnique({
      where: { id: professorId },
      include: { courses: true }
    });
    return professor?.courses || [];
  }

  async countStudentsInCourse(code: string) {
    return db.course.count({
      where: { code, isDeleted: false }
    });
  }
}
