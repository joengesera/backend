import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createWorkSchema, updateWorkSchema } from '../validators/work.validators';
import { PointsEngineService } from '../services/PointsEngineService';
import { WorkService } from '../services/WorkService';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { Prisma } from '@prisma/client';

// CORRECTIF: helper typé pour éviter le cast répété
const getUserId = (req: Request): string | undefined =>
  (req as AuthenticatedRequest).user?.userId;

const toDateOrNull = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return new Date(String(value));
};

export const getWorks = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorisé.', 401, 'UNAUTHORIZED');

    const { courseId, status, startDate, endDate } = req.query;

    // CORRECTIF: type explicite à la place de any
    const where: Prisma.WorkWhereInput = { userId };
    if (courseId) where.courseId = String(courseId);
    if (status) where.status = String(status) as any;
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(String(startDate));
      if (endDate) where.dueDate.lte = new Date(String(endDate));
    }

    const works = await db.work.findMany({
      where,
      include: { workType: { select: { type: true, weightPercent: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    // CORRECTIF: format uniforme { success, data }
    sendSuccess(res, works);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const createWork = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorisé.', 401, 'UNAUTHORIZED');

    const payload = createWorkSchema.parse(req.body);

    const course = await db.course.findUnique({ where: { id: payload.courseId } });
    if (!course || course.userId !== userId) {
      return sendError(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
    }

    if (payload.eventId) {
      const event = await db.event.findUnique({ where: { id: payload.eventId } });
      if (!event || event.userId !== userId) {
        return sendError(res, 'Événement introuvable.', 404, 'EVENT_NOT_FOUND');
      }
    }

    const pointsPossible = Number(payload.pointsPossible ?? 20);
    const pointsEarned = payload.pointsEarned === undefined ? null : Number(payload.pointsEarned);
    const pointsError = WorkService.validatePointsRange(pointsEarned, pointsPossible);
    if (pointsError) return sendError(res, pointsError, 400, 'INVALID_POINTS');

    const label = String(payload.workTypeLabel || '').trim().toUpperCase() || null;
    let workTypeId = payload.workTypeId ?? undefined;
    if (!workTypeId && label) {
      workTypeId = await WorkService.resolveWorkTypeId(payload.courseId, label);
    }
    if (workTypeId) {
      const workType = await db.courseWorkType.findUnique({ where: { id: workTypeId } });
      if (!workType || workType.courseId !== payload.courseId) {
        return sendError(res, 'Type de travail invalide pour ce cours.', 400, 'INVALID_WORK_TYPE');
      }
    }

    const work = await db.work.create({
      data: {
        userId,
        localId: payload.localId,
        title: payload.title,
        description: payload.description,
        status: payload.status ?? 'PLANNED',
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        submittedAt: payload.submittedAt ? new Date(payload.submittedAt) : undefined,
        gradedAt: payload.gradedAt ? new Date(payload.gradedAt) : undefined,
        pointsEarned,
        pointsPossible,
        percentage: payload.percentage,
        comment: payload.comment,
        courseId: payload.courseId,
        eventId: payload.eventId,
        workTypeId,
        workTypeLabel: label,
      },
      include: { workType: { select: { type: true, weightPercent: true } } },
    });

    if (work.status === 'GRADED' && work.pointsEarned !== null) {
      await db.grade.create({
        data: {
          userId,
          courseId: work.courseId,
          workId: work.id,
          score: work.pointsEarned,
          maxScore: work.pointsPossible,
          percentage: work.percentage,
          workTypeLabel: work.workTypeLabel,
          workTypeId: work.workTypeId,
          date: work.gradedAt || new Date(),
          name: work.title,
        }
      });
    }

    sendSuccess(res, work, 201);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.issues.map((i) => i.message).join(', '), 400, 'VALIDATION_ERROR');
    }
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const updateWork = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    if (!userId) return sendError(res, 'Non autorisé.', 401, 'UNAUTHORIZED');

    const payload = updateWorkSchema.parse(req.body);

    const existing = await db.work.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return sendError(res, 'Travail introuvable.', 404, 'WORK_NOT_FOUND');
    }

    const nextPointsPossible =
      payload.pointsPossible !== undefined
        ? Number(payload.pointsPossible)
        : Number(existing.pointsPossible);
    const nextPointsEarned =
      payload.pointsEarned !== undefined
        ? payload.pointsEarned === null
          ? null
          : Number(payload.pointsEarned)
        : existing.pointsEarned;
    const pointsError = WorkService.validatePointsRange(nextPointsEarned, nextPointsPossible);
    if (pointsError) return sendError(res, pointsError, 400, 'INVALID_POINTS');

    if (payload.eventId) {
      const event = await db.event.findUnique({ where: { id: payload.eventId } });
      if (!event || event.userId !== userId) {
        return sendError(res, 'Événement introuvable.', 404, 'EVENT_NOT_FOUND');
      }
    }

    const workTypeLabel =
      typeof payload.workTypeLabel === 'string'
        ? payload.workTypeLabel.trim().toUpperCase() || null
        : payload.workTypeLabel;

    const workTypeId =
      payload.workTypeId === undefined
        ? undefined
        : payload.workTypeId ?? null;

    if (workTypeId) {
      const workType = await db.courseWorkType.findUnique({ where: { id: workTypeId } });
      if (!workType || workType.courseId !== existing.courseId) {
        return sendError(res, 'Type de travail invalide pour ce cours.', 400, 'INVALID_WORK_TYPE');
      }
    }

    // CORRECTIF: plus de spread ...payload avec any — champs explicites
    const resolvedWorkTypeId =
      !workTypeId && workTypeLabel
        ? await WorkService.resolveWorkTypeId(existing.courseId, workTypeLabel)
        : workTypeId;

    const updated = await db.work.update({
      where: { id },
      data: {
        title: payload.title,
        description: payload.description,
        status: payload.status,
        dueDate: toDateOrNull(payload.dueDate),
        submittedAt: toDateOrNull(payload.submittedAt),
        gradedAt: toDateOrNull(payload.gradedAt),
        pointsEarned: nextPointsEarned,
        pointsPossible: nextPointsPossible,
        percentage: payload.percentage,
        comment: payload.comment,
        eventId: payload.eventId,
        workTypeId: resolvedWorkTypeId ?? null,
        workTypeLabel,
        lastModifiedAt: new Date(),
      },
      include: { workType: { select: { type: true, weightPercent: true } } },
    });

    if (updated.status === 'GRADED' && updated.pointsEarned !== null) {
      const existingGrade = await db.grade.findFirst({ where: { workId: updated.id, userId } });
      if (existingGrade) {
        await db.grade.update({
          where: { id: existingGrade.id },
          data: {
            score: updated.pointsEarned,
            maxScore: updated.pointsPossible,
            percentage: updated.percentage,
            workTypeLabel: updated.workTypeLabel,
            workTypeId: updated.workTypeId,
            date: updated.gradedAt || updated.lastModifiedAt,
            name: updated.title,
            courseId: updated.courseId,
          }
        });
      } else {
        await db.grade.create({
          data: {
            userId,
            courseId: updated.courseId,
            workId: updated.id,
            score: updated.pointsEarned,
            maxScore: updated.pointsPossible,
            percentage: updated.percentage,
            workTypeLabel: updated.workTypeLabel,
            workTypeId: updated.workTypeId,
            date: updated.gradedAt || updated.lastModifiedAt,
            name: updated.title,
          }
        });
      }
    } else {
      await db.grade.deleteMany({
        where: { workId: updated.id, userId }
      });
    }

    sendSuccess(res, updated);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.issues.map((i) => i.message).join(', '), 400, 'VALIDATION_ERROR');
    }
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const deleteWork = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    if (!userId) return sendError(res, 'Non autorisé.', 401, 'UNAUTHORIZED');

    const work = await db.work.findUnique({ where: { id } });
    if (!work || work.userId !== userId) {
      return sendError(res, 'Travail introuvable.', 404, 'WORK_NOT_FOUND');
    }

    await db.grade.deleteMany({ where: { workId: id, userId } });
    await db.work.delete({ where: { id } });
    sendSuccess(res, { message: 'Travail supprimé avec succès.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const recalculateWorkPoints = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    if (!userId) return sendError(res, 'Non autorisé.', 401, 'UNAUTHORIZED');

    const work = await db.work.findUnique({
      where: { id },
      include: { workType: { select: { type: true, weightPercent: true } } },
    });
    if (!work || work.userId !== userId) {
      return sendError(res, 'Travail introuvable.', 404, 'WORK_NOT_FOUND');
    }

    const normalized =
      work.pointsEarned === null
        ? null
        : Math.round(
          PointsEngineService.normalizeToTwenty(
            Number(work.pointsEarned),
            Number(work.pointsPossible)
          ) * 100
        ) / 100;

    const courseSnapshot = await WorkService.recalculateForCourse(userId, work.courseId);

    sendSuccess(res, {
      workId: work.id,
      normalizedOn20: normalized,
      percentage: work.percentage ?? null,
      courseAverage: courseSnapshot.average,
      gradedWorkCount: courseSnapshot.gradedWorkCount,
      workCount: courseSnapshot.workCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};