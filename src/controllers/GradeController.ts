import { Request, Response } from 'express';
import { WorkType } from '@prisma/client';
import { db } from '../lib/db';
import { GradeService } from '../services/GradeService';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const validateScoreRange = (score: number, maxScore: number) => {
  if (!isFiniteNumber(score) || !isFiniteNumber(maxScore)) {
    return 'Score et maximum doivent etre des nombres valides';
  }
  if (maxScore <= 0) return 'Le maximum doit etre superieur a 0';
  if (score < 0 || score > maxScore) {
    return 'Le score doit etre compris entre 0 et le maximum';
  }
  return null;
};

const resolveWorkTypeId = async (courseId: string, workType?: WorkType) => {
  const configured = await db.courseWorkType.findMany({
    where: { courseId },
    select: { id: true, type: true }
  });

  if (configured.length === 0) return undefined;

  const requestedType = (workType || WorkType.EXAMEN) as WorkType;
  const match = configured.find((item) => item.type === requestedType);
  return match ? match.id : null;
};

export const getGrades = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { courseId } = req.query;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const where: any = { userId };
    if (courseId) where.courseId = String(courseId);

    const grades = await db.grade.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        workType: { select: { type: true, weightPercent: true } }
      }
    });
    res.json(grades);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createGrade = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { localId, name, score, maxScore, date, comment, courseId, workType } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!name || !courseId) {
      return res.status(400).json({ error: 'Nom et cours sont requis' });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, userId: true }
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const scoreNum = Number(score);
    const maxScoreNum = maxScore === undefined ? 20 : Number(maxScore);
    const rangeError = validateScoreRange(scoreNum, maxScoreNum);
    if (rangeError) return res.status(400).json({ error: rangeError });

    const workTypeId = await resolveWorkTypeId(courseId, workType as WorkType | undefined);
    if (workTypeId === null) {
      return res.status(400).json({ error: 'Type de travail non configure pour ce cours' });
    }

    const grade = await db.grade.create({
      data: {
        localId,
        userId,
        name,
        score: scoreNum,
        maxScore: maxScoreNum,
        date: date ? new Date(date) : undefined,
        comment,
        courseId,
        workTypeId: workTypeId || undefined
      },
      include: {
        workType: { select: { type: true, weightPercent: true } }
      }
    });

    res.status(201).json(grade);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateGrade = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params as { id: string };
    const data = { ...req.body };

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const grade = await db.grade.findUnique({ where: { id } });
    if (!grade || grade.userId !== userId) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    if (data.courseId !== undefined) delete data.courseId;
    if (data.weight !== undefined) delete data.weight;

    const nextScore = data.score !== undefined ? Number(data.score) : grade.score;
    const nextMaxScore = data.maxScore !== undefined ? Number(data.maxScore) : grade.maxScore;
    const rangeError = validateScoreRange(nextScore, nextMaxScore);
    if (rangeError) return res.status(400).json({ error: rangeError });

    if (data.score !== undefined) data.score = nextScore;
    if (data.maxScore !== undefined) data.maxScore = nextMaxScore;
    if (data.date) data.date = new Date(data.date);

    if (data.workType) {
      const workTypeId = await resolveWorkTypeId(grade.courseId, data.workType as WorkType);
      if (workTypeId === null) {
        return res.status(400).json({ error: 'Type de travail non configure pour ce cours' });
      }
      data.workTypeId = workTypeId;
      delete data.workType;
    }

    const updated = await db.grade.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        workType: { select: { type: true, weightPercent: true } }
      }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteGrade = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params as { id: string };

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const grade = await db.grade.findUnique({ where: { id } });
    if (!grade || grade.userId !== userId) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    await db.grade.delete({ where: { id } });
    res.json({ message: 'Grade deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGeneralAverage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await GradeService.getGeneralAverage(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCourseAverage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const courseId = req.params.courseId as string;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await GradeService.getCourseAverage(userId, courseId);
    if (!result) return res.status(404).json({ error: 'No grades found for this course' });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGradeStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await GradeService.getGradeStatistics(userId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
