
import { ZodError } from 'zod';
import { db } from '../lib/db';
import { ProfessorRepository, GradeWithRelations } from '../repositories/professor.repository';
import {
  ProfessorAction,
  UpdateGradeDTO,
  UpdateScheduleDTO,
  EventUpdatePayload,
  GradeResponse,
  ProfessorAssignmentResponse
} from '../types/professor.types';
import { logger } from '../utils/logger';
import { AuditService } from './AuditService';
import { CacheService } from './CacheService';
import { UserService } from './UserService';
import { updateGradeSchema, updateScheduleSchema, assignCourseSchema } from '../validators/professor.validators';
import {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  ValidationError,
  HttpError
} from '../errors/http.errors';

export class ProfessorService {
  constructor(
    private readonly repository: ProfessorRepository,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
    private readonly userService: UserService
  ) {}

  async updateGrade(professorId: string, payload: UpdateGradeDTO): Promise<GradeResponse> {
    try {
      const validated = updateGradeSchema.parse(payload);
      const normalizedMaxScore = validated.maxScore ?? 20;
      const parsedDate = validated.date ? new Date(validated.date) : undefined;
      const comment = validated.comment?.trim();
      const name = validated.name?.trim() || 'Note du professeur';

      await this.checkPermissions(professorId, ProfessorAction.UPDATE_GRADE);
      await this.ensureProfessorAssignment(professorId, validated.courseId);

      const existingGrade = validated.gradeId
        ? await this.repository.findGradeById(validated.gradeId)
        : null;
      const workGrade = !existingGrade && validated.workId
        ? await this.repository.findGradeByWork(validated.studentId, validated.courseId, validated.workId)
        : null;

      const resolvedGrade = existingGrade ?? workGrade;

      let resolvedWorkTypeId: string | null | undefined = undefined;
      if (validated.workId) {
        const work = await this.repository.findWork(validated.workId);
        if (!work) {
          throw new NotFoundError('Travail introuvable.');
        }
        if (work.courseId !== validated.courseId) {
          throw new ForbiddenError('Le travail doit appartenir au même cours.');
        }
        resolvedWorkTypeId = work.workTypeId ?? null;
      }

      const baseData: any = {
        score: validated.score,
        maxScore: normalizedMaxScore,
        comment: comment || undefined,
        percentage: validated.percentage ?? undefined,
        name,
        date: parsedDate,
        updatedAt: new Date()
      };

      if (validated.workId !== undefined) {
        baseData.workId = validated.workId;
      }
      if (resolvedWorkTypeId !== undefined) {
        baseData.workTypeId = resolvedWorkTypeId;
      }

      const grade = resolvedGrade
        ? await this.repository.updateGrade(resolvedGrade.id, baseData)
        : await this.repository.createGrade({
            ...baseData,
            userId: validated.studentId,
            courseId: validated.courseId
          });

      await this.cache.invalidate('grades:course:');
      await this.auditService.log({
        action: 'GRADE_UPSERT',
        userId: professorId,
        resourceId: grade.id,
        metadata: {
          courseId: validated.courseId,
          studentId: validated.studentId
        }
      });

      logger.info({
        msg: 'Grade enregistrée',
        gradeId: grade.id,
        courseId: validated.courseId,
        professorId
      });

      return this.mapGradeResponse(grade);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error.issues[0]?.message ?? 'Données de note invalides.');
      }
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error({ msg: 'Mise à jour de note échouée', error, professorId });
      throw new InternalServerError('Impossible de mettre à jour la note.');
    }
  }

  async updateSchedule(professorId: string, courseId: string, events: EventUpdatePayload[]): Promise<any[]> {
    try {
      const validated: UpdateScheduleDTO = updateScheduleSchema.parse({ courseId, events });
      await this.checkPermissions(professorId, ProfessorAction.UPDATE_SCHEDULE);
      await this.ensureProfessorAssignment(professorId, validated.courseId);

      const updates: any[] = [];

      for (const eventPayload of validated.events) {
        const existingEvent = await this.repository.findEvent(eventPayload.id);
        if (!existingEvent || existingEvent.courseId !== validated.courseId) {
          throw new NotFoundError('Événement invalide ou non lié au cours.');
        }

        const eventData: any = {};
        if (eventPayload.title !== undefined) eventData.title = eventPayload.title;
        if (eventPayload.description !== undefined) eventData.description = eventPayload.description;
        if (eventPayload.location !== undefined) eventData.location = eventPayload.location;
        if (eventPayload.startDate !== undefined)
          eventData.startDate = new Date(eventPayload.startDate);
        if (eventPayload.endDate !== undefined)
          eventData.endDate = new Date(eventPayload.endDate);
        if (eventPayload.isAllDay !== undefined) eventData.isAllDay = eventPayload.isAllDay;
        if (eventPayload.recurrence !== undefined) eventData.recurrence = eventPayload.recurrence;
        if (eventPayload.type !== undefined) eventData.type = eventPayload.type as any;

        if (Object.keys(eventData).length === 0) {
          continue;
        }

        const updatedEvent = await this.repository.updateEvent(eventPayload.id, eventData);
        updates.push(updatedEvent);
      }

      if (updates.length > 0) {
        await this.cache.invalidate('events:course:');
        await this.auditService.log({
          action: 'EVENTS_UPDATED',
          userId: professorId,
          metadata: { courseId: validated.courseId, updatedCount: updates.length }
        });
        logger.info({
          msg: 'Événements mis à jour',
          courseId: validated.courseId,
          professorId,
          updatedCount: updates.length
        });
      }

      return updates;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error.issues[0]?.message ?? 'Données d’événement invalides.');
      }
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error({ msg: 'Mise à jour du planning échouée', error, professorId, courseId });
      throw new InternalServerError('Impossible de mettre à jour le planning.');
    }
  }

  async getMyCourses(professorId: string): Promise<any[]> {
    const professor = await this.repository.findProfessorWithCourses(professorId);
    if (!professor) {
      throw new NotFoundError('Profil professeur introuvable.');
    }
    
    // Enrich with student counts
    const courses: any[] = professor.courses;
    const enriched = await Promise.all(courses.map(async (course) => {
      const count = await this.repository.countStudentsInCourse(course.code);
      return { ...course, studentCount: count };
    }));

    return enriched;
  }

  async getStudentsInCourse(professorId: string, courseCode: string): Promise<any[]> {
    await this.checkPermissions(professorId, ProfessorAction.UPDATE_GRADE);
    
    const studentCourses = await db.course.findMany({
      where: { code: courseCode, isDeleted: false },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        },
        grades: {
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    });

    return studentCourses.map(sc => ({
      courseId: sc.id,
      student: sc.user,
      lastGrades: sc.grades
    }));
  }

  async assignToCourse(professorId: string, courseId: string): Promise<ProfessorAssignmentResponse> {
    try {
      assignCourseSchema.parse({ courseId });
      await this.checkPermissions(professorId, ProfessorAction.ASSIGN_COURSE);

      const professor = await this.repository.findProfessorWithCourses(professorId);
      if (!professor) {
        throw new NotFoundError('Profil professeur introuvable.');
      }

      const course = await this.repository.findCourse(courseId);
      if (!course) {
        throw new NotFoundError('Cours introuvable.');
      }

      await this.repository.assignCourse(professor.id, courseId);
      const courses = await this.repository.listCoursesForProfessor(professor.id);

      await this.cache.invalidate('professor::courses');
      await this.auditService.log({
        action: 'COURSE_ASSIGNED',
        userId: professorId,
        resourceId: courseId,
        metadata: { professorId: professor.id }
      });

      logger.info({ msg: 'Cours assigné au professeur', professorId, courseId });

      return {
        id: professor.id,
        userId: professor.userId,
        courses
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error.issues[0]?.message ?? 'courseId invalide.');
      }
      if (error instanceof HttpError) {
        throw error;
      }
      logger.error({ msg: 'Assignment de cours échoué', error, professorId, courseId });
      throw new InternalServerError('Impossible d’assigner le cours.');
    }
  }

  private async ensureProfessorAssignment(professorId: string, courseId: string) {
    const professor = await this.repository.findProfessorWithCourses(professorId);

    if (!professor || !professor.courses.some((course: any) => course.id === courseId)) {
      throw new ForbiddenError('Vous n’êtes pas autorisé à modifier ce cours.');
    }

    return professor;
  }

  private async checkPermissions(userId: string, action: ProfessorAction) {
    const user = await this.userService.getUser(userId);
    if (!user || !user.permissions.includes(action)) {
      throw new ForbiddenError('Permissions insuffisantes.');
    }
  }

  private mapGradeResponse(grade: GradeWithRelations): GradeResponse {
    return {
      id: grade.id,
      name: grade.name,
      score: grade.score,
      maxScore: grade.maxScore,
      percentage: grade.percentage ?? null,
      comment: grade.comment ?? null,
      workId: grade.workId ?? null,
      work: grade.work as any ?? null,
      workType: grade.workType as any ?? null,
      date: grade.date ?? null,
      updatedAt: grade.updatedAt
    };
  }
}
