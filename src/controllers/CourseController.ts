import { Request, Response } from 'express';
import { db } from '../lib/db';
import { normalizeWorkTypes } from '../services/courseWorkTypeService';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const getUserId = (req: Request): string | undefined =>
  (req as AuthenticatedRequest).user?.userId;

export const getCourses = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const courses = await db.course.findMany({
      where: { userId, isDeleted: false },
      orderBy: { updatedAt: 'desc' }
    });

    sendSuccess(res, courses);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const getCourseById = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const course = await db.course.findFirst({
      where: { id, userId, isDeleted: false }
    });

    if (!course) return sendError(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');

    sendSuccess(res, course);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const searchCourses = async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) return sendSuccess(res, []);

    const courses = await db.course.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } }
        ],
        isDeleted: false
      },
      distinct: ['code'],
      take: 10
    });

    sendSuccess(res, courses);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const createCourse = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { code, name, description, color, credits, workTypes } = req.body;

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const normalized = normalizeWorkTypes(workTypes);
    if (!normalized.ok) return sendError(res, normalized.error, 400, 'INVALID_WORK_TYPES');

    const course = await db.$transaction(async (tx) => {
      const created = await tx.course.create({
        data: { userId, code, name, description, color, credits }
      });

      await tx.courseWorkType.createMany({
        data: normalized.items.map((item) => ({
          courseId: created.id,
          type: item.type,
          weightPercent: item.weightPercent
        }))
      });

      return created;
    });

    sendSuccess(res, course, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const getCourseWorkTypes = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const courseId = String(req.params.id);

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== userId) {
      return sendError(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
    }

    const workTypes = await db.courseWorkType.findMany({
      where: { courseId },
      orderBy: { type: 'asc' }
    });

    sendSuccess(res, workTypes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const updateCourseWorkTypes = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const courseId = String(req.params.id);
    const { workTypes } = req.body as { workTypes?: unknown };

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== userId) {
      return sendError(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
    }

    const normalized = normalizeWorkTypes(workTypes);
    if (!normalized.ok) return sendError(res, normalized.error, 400, 'INVALID_WORK_TYPES');

    const existing = await db.courseWorkType.findMany({ where: { courseId } });
    const keepTypes = new Set(normalized.items.map((item) => item.type));
    const toDelete = existing.filter((item) => !keepTypes.has(item.type));

    if (toDelete.length > 0) {
      const [usedByGrades, usedByWorks] = await db.$transaction([
        db.grade.count({ where: { courseId, workTypeId: { in: toDelete.map((item) => item.id) } } }),
        db.work.count({ where: { courseId, workTypeId: { in: toDelete.map((item) => item.id) } } })
      ]);

      if (usedByGrades > 0 || usedByWorks > 0) {
        return sendError(
          res,
          'Impossible de supprimer un type deja utilise par des notes ou des travaux.',
          400,
          'WORK_TYPE_IN_USE'
        );
      }
    }

    await db.$transaction([
      db.courseWorkType.deleteMany({ where: { id: { in: toDelete.map((item) => item.id) } } }),
      ...normalized.items.map((item) =>
        db.courseWorkType.upsert({
          where: { courseId_type: { courseId, type: item.type } },
          update: { weightPercent: item.weightPercent },
          create: { courseId, type: item.type, weightPercent: item.weightPercent }
        })
      )
    ]);

    const updated = await db.courseWorkType.findMany({
      where: { courseId },
      orderBy: { type: 'asc' }
    });

    sendSuccess(res, updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const initCourseWorkTypes = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const courses = await db.course.findMany({
      where: { userId, isDeleted: false },
      select: { id: true }
    });

    if (courses.length === 0) return sendSuccess(res, { created: 0 });

    const courseIds = courses.map((course) => course.id);
    const existing = await db.courseWorkType.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true }
    });

    const existingSet = new Set(existing.map((item) => item.courseId));
    const missing = courseIds.filter((id) => !existingSet.has(id));

    if (missing.length === 0) return sendSuccess(res, { created: 0 });

    const defaults = normalizeWorkTypes();
    if (!defaults.ok) {
      return sendError(res, "Impossible d'initialiser les types de travaux.", 500, 'INIT_WORK_TYPES_FAILED');
    }

    await db.courseWorkType.createMany({
      data: missing.flatMap((courseId) =>
        defaults.items.map((item) => ({
          courseId,
          type: item.type,
          weightPercent: item.weightPercent
        }))
      )
    });

    sendSuccess(res, { created: missing.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const updateCourse = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    const data = req.body;

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const course = await db.course.findUnique({ where: { id } });
    if (!course || course.userId !== userId) {
      return sendError(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
    }

    const updated = await db.course.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });

    sendSuccess(res, updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const course = await db.course.findUnique({ where: { id } });
    if (!course || course.userId !== userId) {
      return sendError(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
    }

    await db.course.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    sendSuccess(res, { message: 'Cours supprime avec succes.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};
