import { Request, Response } from 'express';
import { db } from '../lib/db';
import { GradeService } from '../services/GradeService';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const getUserId = (req: Request): string | undefined =>
  (req as AuthenticatedRequest).user?.userId;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const validateScoreRange = (score: number, maxScore: number) => {
  if (!isFiniteNumber(score) || !isFiniteNumber(maxScore)) {
    return 'Score et maximum doivent etre des nombres valides';
  }
  if (maxScore <= 0) return 'Le maximum doit etre superieur a 0';
  if (score < 0 || score > maxScore) return 'Le score doit etre compris entre 0 et le maximum';
  return null;
};

const resolveWorkTypeId = async (courseId: string, workType?: string) => {
  const configured = await db.courseWorkType.findMany({
    where: { courseId },
    select: { id: true, type: true }
  });

  if (configured.length === 0 || !workType) return undefined;
  const normalized = String(workType).trim().toUpperCase();
  const match = configured.find((item) => item.type.toUpperCase() === normalized);
  return match ? match.id : undefined;
};

export const getGrades = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { courseId } = req.query;

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const where: { userId: string; courseId?: string } = { userId };
    if (courseId) where.courseId = String(courseId);

    const grades = await db.grade.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        workType: { select: { type: true, weightPercent: true } },
        work: { select: { id: true, title: true } }
      }
    });

    sendSuccess(res, grades);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const createGrade = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { localId, name, score, maxScore, date, comment, courseId, workId, workType, workTypeLabel, percentage } = req.body;

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');
    if (!name || !courseId) return sendError(res, 'Nom et cours sont requis.', 400, 'MISSING_FIELDS');

    const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, userId: true } });
    if (!course) return sendError(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
    if (course.userId !== userId) return sendError(res, 'Acces refuse.', 403, 'FORBIDDEN');

    const scoreNum = Number(score);
    const maxScoreNum = maxScore === undefined ? 20 : Number(maxScore);
    const percentageNum = percentage === undefined || percentage === null || percentage === '' ? undefined : Number(percentage);

    const rangeError = validateScoreRange(scoreNum, maxScoreNum);
    if (rangeError) return sendError(res, rangeError, 400, 'INVALID_SCORE_RANGE');
    if (percentageNum !== undefined && (!Number.isFinite(percentageNum) || percentageNum < 0 || percentageNum > 100)) {
      return sendError(res, 'Le pourcentage doit etre compris entre 0 et 100.', 400, 'INVALID_PERCENTAGE');
    }

    const normalizedLabel = String(workTypeLabel || workType || '').trim().toUpperCase() || null;
    let resolvedWorkId: string | undefined;
    let resolvedWorkTypeId = await resolveWorkTypeId(courseId, normalizedLabel || undefined);

    if (workId) {
      const work = await db.work.findUnique({
        where: { id: String(workId) },
        select: { id: true, userId: true, courseId: true, workTypeId: true }
      });

      if (!work) return sendError(res, 'Travail introuvable.', 404, 'WORK_NOT_FOUND');
      if (work.userId !== userId) return sendError(res, 'Acces refuse.', 403, 'FORBIDDEN');
      if (work.courseId !== courseId) {
        return sendError(res, 'Le travail doit appartenir au meme cours.', 400, 'INVALID_WORK_COURSE');
      }

      resolvedWorkId = work.id;
      resolvedWorkTypeId = resolvedWorkTypeId || work.workTypeId || undefined;
    }

    const grade = await db.grade.create({
      data: {
        localId,
        userId,
        name,
        score: scoreNum,
        maxScore: maxScoreNum,
        percentage: percentageNum,
        workTypeLabel: normalizedLabel,
        workId: resolvedWorkId,
        date: date ? new Date(date) : undefined,
        comment,
        courseId,
        workTypeId: resolvedWorkTypeId || undefined
      },
      include: {
        workType: { select: { type: true, weightPercent: true } },
        work: { select: { id: true, title: true } }
      }
    });

    sendSuccess(res, grade, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const updateGrade = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };
    const data = { ...req.body };

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const grade = await db.grade.findUnique({ where: { id } });
    if (!grade || grade.userId !== userId) {
      return sendError(res, 'Note introuvable.', 404, 'GRADE_NOT_FOUND');
    }

    if (data.courseId !== undefined) delete data.courseId;
    if (data.weight !== undefined) delete data.weight;

    const nextScore = data.score !== undefined ? Number(data.score) : grade.score;
    const nextMaxScore = data.maxScore !== undefined ? Number(data.maxScore) : grade.maxScore;
    const rangeError = validateScoreRange(nextScore, nextMaxScore);
    if (rangeError) return sendError(res, rangeError, 400, 'INVALID_SCORE_RANGE');

    if (data.score !== undefined) data.score = nextScore;
    if (data.maxScore !== undefined) data.maxScore = nextMaxScore;
    if (data.date) data.date = new Date(data.date);

    if (data.percentage !== undefined && data.percentage !== null && data.percentage !== '') {
      const p = Number(data.percentage);
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return sendError(res, 'Le pourcentage doit etre compris entre 0 et 100.', 400, 'INVALID_PERCENTAGE');
      }
      data.percentage = p;
    }

    const incomingWorkType = data.workTypeLabel || data.workType;
    if (incomingWorkType !== undefined) {
      const normalized = String(incomingWorkType || '').trim().toUpperCase();
      data.workTypeLabel = normalized || null;
      data.workTypeId = normalized ? await resolveWorkTypeId(grade.courseId, normalized) : null;
      delete data.workType;
    }

    if (data.workId !== undefined) {
      if (data.workId === null || data.workId === '') {
        data.workId = null;
      } else {
        const work = await db.work.findUnique({
          where: { id: String(data.workId) },
          select: { id: true, userId: true, courseId: true, workTypeId: true }
        });

        if (!work) return sendError(res, 'Travail introuvable.', 404, 'WORK_NOT_FOUND');
        if (work.userId !== userId) return sendError(res, 'Acces refuse.', 403, 'FORBIDDEN');
        if (work.courseId !== grade.courseId) {
          return sendError(res, 'Le travail doit appartenir au meme cours.', 400, 'INVALID_WORK_COURSE');
        }

        if (!data.workTypeId && !data.workTypeLabel) {
          data.workTypeId = work.workTypeId || null;
        }
        data.workId = work.id;
      }
    }

    const updated = await db.grade.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        workType: { select: { type: true, weightPercent: true } },
        work: { select: { id: true, title: true } }
      }
    });

    sendSuccess(res, updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const deleteGrade = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params as { id: string };

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const grade = await db.grade.findUnique({ where: { id } });
    if (!grade || grade.userId !== userId) {
      return sendError(res, 'Note introuvable.', 404, 'GRADE_NOT_FOUND');
    }

    await db.grade.delete({ where: { id } });
    sendSuccess(res, { message: 'Note supprimee avec succes.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const getGeneralAverage = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const result = await GradeService.getGeneralAverage(userId);
    sendSuccess(res, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const getCourseAverage = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const courseId = req.params.courseId as string;

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const result = await GradeService.getCourseAverage(userId, courseId);
    if (!result) return sendError(res, 'Aucune note trouvee pour ce cours.', 404, 'NO_GRADES');

    sendSuccess(res, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const getGradeStatistics = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const result = await GradeService.getGradeStatistics(userId);
    sendSuccess(res, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};
