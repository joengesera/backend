import { Request, Response } from 'express';
import { db } from '../lib/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { createEventSchema, updateEventSchema } from '../validators/event.validators';
import { z } from 'zod';
import { EventService } from '../services/EventService';
import { sendError, sendSuccess } from '../utils/apiResponse';

const getUserId = (req: Request) => (req as AuthenticatedRequest).user?.userId;

const parseZodError = (error: z.ZodError): string =>
  error.issues.map((issue) => issue.message).join(', ');

export const getEvents = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { startDate, endDate } = req.query;

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const where: Record<string, unknown> = { userId };
    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      };
    }

    const events = await db.event.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });

    sendSuccess(res, events);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const payload = createEventSchema.parse(req.body);

    const eventData = {
      userId,
      title: payload.title,
      description: payload.description,
      type: payload.type || 'CLASS',
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      isAllDay: payload.isAllDay || false,
      location: payload.location,
      recurrence: payload.recurrence,
      course: payload.courseId ? { connect: { id: payload.courseId } } : undefined
    };

    const event = await EventService.createEvent(userId, eventData, payload.generateDefaultTasks);
    sendSuccess(res, event, 201);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return sendError(res, parseZodError(error), 400, 'VALIDATION_ERROR');
    }
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const payload = updateEventSchema.parse(req.body);

    const event = await db.event.findUnique({ where: { id } });
    if (!event || event.userId !== userId) {
      return sendError(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
    }

    const dataToUpdate: Record<string, unknown> = { ...payload };
    if (payload.startDate) dataToUpdate.startDate = new Date(payload.startDate);
    if (payload.endDate) dataToUpdate.endDate = new Date(payload.endDate);
    if (payload.courseId) dataToUpdate.courseId = payload.courseId;

    Object.keys(dataToUpdate).forEach((key) => {
      if (dataToUpdate[key] === undefined) delete dataToUpdate[key];
    });

    const updated = await db.event.update({
      where: { id },
      data: dataToUpdate
    });

    sendSuccess(res, updated);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return sendError(res, parseZodError(error), 400, 'VALIDATION_ERROR');
    }
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const id = String(req.params.id);

    if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

    const event = await db.event.findUnique({ where: { id } });
    if (!event || event.userId !== userId) {
      return sendError(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
    }

    await db.event.delete({ where: { id } });
    sendSuccess(res, { message: 'Evenement supprime avec succes.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};
