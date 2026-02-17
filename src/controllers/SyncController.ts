import { Request, Response } from 'express';
import { WorkType } from '@prisma/client';
import { db } from '../lib/db';
import { normalizeWorkTypes } from '../services/courseWorkTypeService';

type SyncEntity = 'Task' | 'Event' | 'Course' | 'Grade';

async function getOwnerId(entity: SyncEntity, id: string): Promise<string | null> {
  switch (entity) {
    case 'Task': {
      const row = await db.task.findUnique({ where: { id }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'Event': {
      const row = await db.event.findUnique({ where: { id }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'Course': {
      const row = await db.course.findUnique({ where: { id }, select: { userId: true } });
      return row?.userId ?? null;
    }
    case 'Grade': {
      const row = await db.grade.findUnique({ where: { id }, select: { userId: true } });
      return row?.userId ?? null;
    }
    default:
      return null;
  }
}

const validateScoreRange = (score: number, maxScore: number) => {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore)) {
    return 'Score et maximum doivent etre des nombres valides';
  }
  if (maxScore <= 0) return 'Le maximum doit etre superieur a 0';
  if (score < 0 || score > maxScore) {
    return 'Le score doit etre compris entre 0 et le maximum';
  }
  return null;
};

const validateAndNormalizeGradePayload = async (data: any, userId: string) => {
  const courseId = String(data?.courseId || '');
  if (!courseId) return { ok: false as const, error: 'Course requis' };

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, userId: true }
  });
  if (!course) return { ok: false as const, error: 'Course introuvable' };
  if (course.userId !== userId) return { ok: false as const, error: 'Forbidden' };

  const score = Number(data?.score);
  const maxScore = data?.maxScore === undefined ? 20 : Number(data.maxScore);
  const rangeError = validateScoreRange(score, maxScore);
  if (rangeError) return { ok: false as const, error: rangeError };

  const configured = await db.courseWorkType.findMany({
    where: { courseId },
    select: { id: true, type: true }
  });

  let workTypeId: string | undefined;
  if (configured.length > 0) {
    const requestedType = (data?.workType || WorkType.EXAMEN) as WorkType;
    const match = configured.find((item) => item.type === requestedType);
    if (!match) {
      return { ok: false as const, error: 'Type de travail non configure pour ce cours' };
    }
    workTypeId = match.id;
  }

  return {
    ok: true as const,
    values: {
      courseId,
      score,
      maxScore,
      workTypeId
    }
  };
};

export const handleSyncPush = async (req: Request, res: Response) => {
  const { type, entity, data } = req.body;
  const safeUserId = (req as any).user?.userId as string | undefined;

  if (!safeUserId) return res.status(401).json({ error: 'Unauthorized' });
  if (!entity || !['Task', 'Event', 'Course', 'Grade'].includes(entity)) {
    return res.status(400).json({ error: 'Invalid entity' });
  }
  if (!data?.id) return res.status(400).json({ error: 'Missing entity id' });

  try {
    const modelMap: any = {
      Task: db.task,
      Event: db.event,
      Course: db.course,
      Grade: db.grade
    };

    const model = modelMap[entity];
    const existingOwnerId = await getOwnerId(entity as SyncEntity, data.id);
    if (existingOwnerId && existingOwnerId !== safeUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.syncHistory.create({
      data: {
        userId: safeUserId,
        deviceId: req.body.deviceId || 'unknown',
        syncType: 'PUSH',
        status: 'STARTED',
        itemsPushed: 1
      }
    });

    let saved: any = null;

    if (type === 'CREATE' || type === 'UPDATE') {
      const payload: any = { ...data, userId: safeUserId, syncStatus: 'SYNCED', lastModifiedAt: new Date() };
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.workTypes;
      delete payload.workType;
      delete payload.weight;

      if (payload.dueDate) payload.dueDate = new Date(payload.dueDate);
      if (payload.startDate) payload.startDate = new Date(payload.startDate);
      if (payload.endDate) payload.endDate = new Date(payload.endDate);
      if (payload.date) payload.date = new Date(payload.date);

      if (entity === 'Grade') {
        const checked = await validateAndNormalizeGradePayload(data, safeUserId);
        if (!checked.ok) {
          return res.status(400).json({ success: false, error: checked.error });
        }
        payload.courseId = checked.values.courseId;
        payload.score = checked.values.score;
        payload.maxScore = checked.values.maxScore;
        payload.workTypeId = checked.values.workTypeId || null;
      }

      saved = await model.upsert({
        where: { id: data.id },
        update: payload,
        create: payload
      });

      if (entity === 'Course') {
        const courseId = saved.id;
        const existing = await db.courseWorkType.findMany({
          where: { courseId },
          select: { id: true }
        });

        if (data?.workTypes !== undefined) {
          const normalized = normalizeWorkTypes(data.workTypes);
          if (normalized.ok) {
            await db.courseWorkType.deleteMany({ where: { courseId } });
            await db.courseWorkType.createMany({
              data: normalized.items.map((item) => ({
                courseId,
                type: item.type,
                weightPercent: item.weightPercent
              }))
            });
          }
        } else if (existing.length === 0) {
          const defaults = normalizeWorkTypes();
          if (!defaults.ok) {
            return res.status(500).json({ success: false, error: 'Impossible d initialiser les types de travaux' });
          }
          await db.courseWorkType.createMany({
            data: defaults.items.map((item) => ({
              courseId,
              type: item.type,
              weightPercent: item.weightPercent
            }))
          });
        }
      }
    } else if (type === 'DELETE') {
      if (entity === 'Task' || entity === 'Course') {
        await model.update({
          where: { id: data.id },
          data: { isDeleted: true, deletedAt: new Date(), syncStatus: 'SYNCED' }
        });
      } else {
        await model.delete({ where: { id: data.id } });
      }
    } else {
      return res.status(400).json({ error: 'Invalid sync type' });
    }

    let canonicalEntity: any = null;
    if (entity === 'Grade' && saved?.id) {
      canonicalEntity = await db.grade.findUnique({
        where: { id: saved.id },
        include: { workType: { select: { type: true, weightPercent: true } } }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: saved?.id || data.id,
        syncedAt: new Date(),
        entity: canonicalEntity
      }
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const handleSyncPull = async (req: Request, res: Response) => {
  const safeUserId = (req as any).user?.userId as string | undefined;
  if (!safeUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { lastPulledAt } = req.query;

  try {
    const since = lastPulledAt ? new Date(String(lastPulledAt)) : new Date(0);

    const tasks = await db.task.findMany({ where: { userId: safeUserId, lastModifiedAt: { gt: since } } });
    const events = await db.event.findMany({ where: { userId: safeUserId, lastModifiedAt: { gt: since } } });
    const grades = await db.grade.findMany({
      where: { userId: safeUserId, lastModifiedAt: { gt: since } },
      include: { workType: { select: { type: true, weightPercent: true } } }
    });
    const courses = await db.course.findMany({ where: { userId: safeUserId, updatedAt: { gt: since } } });

    await db.syncHistory.create({
      data: {
        userId: safeUserId,
        deviceId: (req.query.deviceId as string) || 'unknown',
        syncType: 'PULL',
        status: 'COMPLETED',
        itemsPulled: tasks.length + events.length + grades.length + courses.length
      }
    });

    res.json({
      changes: { tasks, events, grades, courses },
      tasks,
      events,
      grades,
      courses,
      timestamp: new Date()
    });
  } catch {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
