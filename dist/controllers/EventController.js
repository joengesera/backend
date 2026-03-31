"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEvents = void 0;
const db_1 = require("../lib/db");
const event_validators_1 = require("../validators/event.validators");
const zod_1 = require("zod");
const EventService_1 = require("../services/EventService");
const apiResponse_1 = require("../utils/apiResponse");
const getUserId = (req) => req.user?.userId;
const parseZodError = (error) => error.issues.map((issue) => issue.message).join(', ');
const getEvents = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { startDate, endDate } = req.query;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const where = { userId };
        if (startDate && endDate) {
            where.startDate = {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate))
            };
        }
        const events = await db_1.db.event.findMany({
            where,
            orderBy: { startDate: 'asc' }
        });
        (0, apiResponse_1.sendSuccess)(res, events);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getEvents = getEvents;
const createEvent = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const payload = event_validators_1.createEventSchema.parse(req.body);
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
        const event = await EventService_1.EventService.createEvent(userId, eventData, payload.generateDefaultTasks);
        (0, apiResponse_1.sendSuccess)(res, event, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return (0, apiResponse_1.sendError)(res, parseZodError(error), 400, 'VALIDATION_ERROR');
        }
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.createEvent = createEvent;
const updateEvent = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const payload = event_validators_1.updateEventSchema.parse(req.body);
        const event = await db_1.db.event.findUnique({ where: { id } });
        if (!event || event.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
        }
        const dataToUpdate = { ...payload };
        if (payload.startDate)
            dataToUpdate.startDate = new Date(payload.startDate);
        if (payload.endDate)
            dataToUpdate.endDate = new Date(payload.endDate);
        if (payload.courseId)
            dataToUpdate.courseId = payload.courseId;
        Object.keys(dataToUpdate).forEach((key) => {
            if (dataToUpdate[key] === undefined)
                delete dataToUpdate[key];
        });
        const updated = await db_1.db.event.update({
            where: { id },
            data: dataToUpdate
        });
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return (0, apiResponse_1.sendError)(res, parseZodError(error), 400, 'VALIDATION_ERROR');
        }
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.updateEvent = updateEvent;
const deleteEvent = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const event = await db_1.db.event.findUnique({ where: { id } });
        if (!event || event.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
        }
        await db_1.db.event.delete({ where: { id } });
        (0, apiResponse_1.sendSuccess)(res, { message: 'Evenement supprime avec succes.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.deleteEvent = deleteEvent;
