import { Request, Response } from 'express';
import { db } from '../lib/db';
import { TaskService } from '../services/TaskService';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createTaskSchema, updateTaskSchema, reorderTasksSchema } from '../validators/task.validators';
import { z } from 'zod';
import { sendError, sendSuccess } from '../utils/apiResponse';

const getUserId = (req: Request) => (req as AuthenticatedRequest).user?.userId;

const toDateOrUndefined = (value: unknown) => {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const parseZodError = (error: z.ZodError): string =>
  error.issues.map((issue) => issue.message).join(', ');

export const getTasks = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { courseId, eventId } = req.query;

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const where: { userId: string; isDeleted: boolean; courseId?: string; eventId?: string } = {
      userId,
      isDeleted: false
    };
    if (courseId) where.courseId = String(courseId);
    if (eventId) where.eventId = String(eventId);

    const tasks = await db.task.findMany({
      where,
      orderBy: [{ position: 'asc' }, { dueDate: 'asc' }]
    });

    sendSuccess(res, tasks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const payload = createTaskSchema.parse(req.body);

    if (payload.eventId) {
      const event = await db.event.findUnique({ where: { id: payload.eventId } });
      if (!event || event.userId !== userId) return sendError(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
    }

    const maxPositionTask = await db.task.findFirst({
      where: { userId, eventId: payload.eventId ?? null, isDeleted: false },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const task = await db.task.create({
      data: {
        userId,
        title: payload.title,
        description: payload.description,
        status: payload.status ?? 'PENDING',
        priority: payload.priority ?? 'MEDIUM',
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        courseId: payload.courseId,
        eventId: payload.eventId,
        durationMinutes: payload.durationMinutes,
        position: (maxPositionTask?.position ?? -1) + 1
      }
    });

    sendSuccess(res, task, 201);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return sendError(res, parseZodError(error), 400, 'VALIDATION_ERROR');
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const payload = updateTaskSchema.parse(req.body);

    const task = await db.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      return sendError(res, 'Tache introuvable.', 404, 'TASK_NOT_FOUND');
    }

    if (payload.eventId) {
      const event = await db.event.findUnique({ where: { id: payload.eventId } });
      if (!event || event.userId !== userId) return sendError(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
    }

    const updated = await db.task.update({
      where: { id },
      data: {
        ...payload,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        updatedAt: new Date()
      }
    });

    sendSuccess(res, updated);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return sendError(res, parseZodError(error), 400, 'VALIDATION_ERROR');
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const task = await db.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      return sendError(res, 'Tache introuvable.', 404, 'TASK_NOT_FOUND');
    }

    await db.task.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    sendSuccess(res, { message: 'Tache supprimee avec succes.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const getBoardTasks = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { from, to } = req.query;
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const where: { userId: string; startDate?: { gte?: Date; lte?: Date } } = { userId };
    if (from || to) {
      where.startDate = {};
      const fromDate = toDateOrUndefined(from);
      const toDate = toDateOrUndefined(to);
      if (from && !fromDate) return sendError(res, 'Date from invalide.', 400, 'INVALID_FROM_DATE');
      if (to && !toDate) return sendError(res, 'Date to invalide.', 400, 'INVALID_TO_DATE');
      if (fromDate) where.startDate.gte = fromDate;
      if (toDate) where.startDate.lte = toDate;
    }

    const events = await db.event.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        tasks: {
          where: { isDeleted: false },
          orderBy: [{ position: 'asc' }, { dueDate: 'asc' }]
        }
      }
    });

    sendSuccess(res, events);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const getTasksByEvent = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const eventId = String(req.params.eventId);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.userId !== userId) {
      return sendError(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
    }

    const tasks = await db.task.findMany({
      where: { userId, eventId, isDeleted: false },
      orderBy: [{ position: 'asc' }, { dueDate: 'asc' }]
    });

    sendSuccess(res, tasks);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const createTaskForEvent = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const eventId = String(req.params.eventId);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event || event.userId !== userId) {
      return sendError(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
    }

    const bodyWithEvent = { ...req.body, eventId };
    const validated = createTaskSchema.parse(bodyWithEvent);

    const last = await db.task.findFirst({
      where: { userId, eventId, isDeleted: false },
      orderBy: { position: 'desc' },
      select: { position: true }
    });

    const task = await db.task.create({
      data: {
        userId,
        eventId,
        title: validated.title,
        description: validated.description,
        priority: validated.priority ?? 'MEDIUM',
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
        durationMinutes: validated.durationMinutes,
        courseId: validated.courseId ?? event.courseId ?? undefined,
        position: (last?.position ?? -1) + 1
      }
    });

    sendSuccess(res, task, 201);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return sendError(res, parseZodError(error), 400, 'VALIDATION_ERROR');
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const reorderTasks = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const payload = reorderTasksSchema.parse(req.body);
    await TaskService.reorderTasks(userId, payload.items);

    sendSuccess(res, { message: 'Ordre des taches mis a jour.' });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return sendError(res, parseZodError(error), 400, 'VALIDATION_ERROR');
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const startTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const updated = await TaskService.startTask(id, userId);
    sendSuccess(res, updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    const status = message === 'Task not found' ? 404 : 400;
    sendError(res, message, status, status === 404 ? 'TASK_NOT_FOUND' : 'BAD_REQUEST');
  }
};

export const pauseTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const result = await TaskService.pauseTask(id, userId);
    sendSuccess(res, result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    const status = message === 'Task not found' ? 404 : 400;
    sendError(res, message, status, status === 404 ? 'TASK_NOT_FOUND' : 'BAD_REQUEST');
  }
};

export const completeTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const updated = await TaskService.completeTask(id, userId);
    sendSuccess(res, updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    const status = message === 'Task not found' ? 404 : 400;
    sendError(res, message, status, status === 404 ? 'TASK_NOT_FOUND' : 'BAD_REQUEST');
  }
};

export const getCurrentFocusTask = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const task = await db.task.findFirst({
      where: { userId, startedAt: { not: null }, isDeleted: false },
      orderBy: { startedAt: 'desc' }
    });

    sendSuccess(res, task);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};
