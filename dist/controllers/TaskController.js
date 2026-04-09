"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentFocusTask = exports.completeTask = exports.pauseTask = exports.startTask = exports.reorderTasks = exports.createTaskForEvent = exports.getTasksByEvent = exports.getBoardTasks = exports.deleteTask = exports.updateTask = exports.createTask = exports.getTasks = void 0;
const db_1 = require("../lib/db");
const TaskService_1 = require("../services/TaskService");
const task_validators_1 = require("../validators/task.validators");
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
const getUserId = (req) => req.user?.userId;
const toDateOrUndefined = (value) => {
    if (!value)
        return undefined;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};
const parseZodError = (error) => error.issues.map((issue) => issue.message).join(', ');
const getTasks = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { courseId, eventId } = req.query;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const where = {
            userId,
            isDeleted: false
        };
        if (courseId)
            where.courseId = String(courseId);
        if (eventId)
            where.eventId = String(eventId);
        const tasks = await db_1.db.task.findMany({
            where,
            orderBy: [{ position: 'asc' }, { dueDate: 'asc' }]
        });
        (0, apiResponse_1.sendSuccess)(res, tasks);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getTasks = getTasks;
const createTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const payload = task_validators_1.createTaskSchema.parse(req.body);
        if (payload.eventId) {
            const event = await db_1.db.event.findUnique({ where: { id: payload.eventId } });
            if (!event || event.userId !== userId)
                return (0, apiResponse_1.sendError)(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
        }
        const maxPositionTask = await db_1.db.task.findFirst({
            where: { userId, eventId: payload.eventId ?? null, isDeleted: false },
            orderBy: { position: 'desc' },
            select: { position: true }
        });
        const task = await db_1.db.task.create({
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
        (0, apiResponse_1.sendSuccess)(res, task, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return (0, apiResponse_1.sendError)(res, parseZodError(error), 400, 'VALIDATION_ERROR');
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.createTask = createTask;
const updateTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const payload = task_validators_1.updateTaskSchema.parse(req.body);
        const task = await db_1.db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Tache introuvable.', 404, 'TASK_NOT_FOUND');
        }
        if (payload.eventId) {
            const event = await db_1.db.event.findUnique({ where: { id: payload.eventId } });
            if (!event || event.userId !== userId)
                return (0, apiResponse_1.sendError)(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
        }
        const updated = await db_1.db.task.update({
            where: { id },
            data: {
                ...payload,
                dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
                updatedAt: new Date()
            }
        });
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return (0, apiResponse_1.sendError)(res, parseZodError(error), 400, 'VALIDATION_ERROR');
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const task = await db_1.db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Tache introuvable.', 404, 'TASK_NOT_FOUND');
        }
        await db_1.db.task.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        (0, apiResponse_1.sendSuccess)(res, { message: 'Tache supprimee avec succes.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.deleteTask = deleteTask;
const getBoardTasks = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { from, to } = req.query;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const where = { userId };
        if (from || to) {
            where.startDate = {};
            const fromDate = toDateOrUndefined(from);
            const toDate = toDateOrUndefined(to);
            if (from && !fromDate)
                return (0, apiResponse_1.sendError)(res, 'Date from invalide.', 400, 'INVALID_FROM_DATE');
            if (to && !toDate)
                return (0, apiResponse_1.sendError)(res, 'Date to invalide.', 400, 'INVALID_TO_DATE');
            if (fromDate)
                where.startDate.gte = fromDate;
            if (toDate)
                where.startDate.lte = toDate;
        }
        const events = await db_1.db.event.findMany({
            where,
            orderBy: { startDate: 'asc' },
            include: {
                tasks: {
                    where: { isDeleted: false },
                    orderBy: [{ position: 'asc' }, { dueDate: 'asc' }]
                }
            }
        });
        (0, apiResponse_1.sendSuccess)(res, events);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getBoardTasks = getBoardTasks;
const getTasksByEvent = async (req, res) => {
    try {
        const userId = getUserId(req);
        const eventId = String(req.params.eventId);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const event = await db_1.db.event.findUnique({ where: { id: eventId } });
        if (!event || event.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
        }
        const tasks = await db_1.db.task.findMany({
            where: { userId, eventId, isDeleted: false },
            orderBy: [{ position: 'asc' }, { dueDate: 'asc' }]
        });
        (0, apiResponse_1.sendSuccess)(res, tasks);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getTasksByEvent = getTasksByEvent;
const createTaskForEvent = async (req, res) => {
    try {
        const userId = getUserId(req);
        const eventId = String(req.params.eventId);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const event = await db_1.db.event.findUnique({ where: { id: eventId } });
        if (!event || event.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Evenement introuvable.', 404, 'EVENT_NOT_FOUND');
        }
        const bodyWithEvent = { ...req.body, eventId };
        const validated = task_validators_1.createTaskSchema.parse(bodyWithEvent);
        const last = await db_1.db.task.findFirst({
            where: { userId, eventId, isDeleted: false },
            orderBy: { position: 'desc' },
            select: { position: true }
        });
        const task = await db_1.db.task.create({
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
        (0, apiResponse_1.sendSuccess)(res, task, 201);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return (0, apiResponse_1.sendError)(res, parseZodError(error), 400, 'VALIDATION_ERROR');
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.createTaskForEvent = createTaskForEvent;
const reorderTasks = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const payload = task_validators_1.reorderTasksSchema.parse(req.body);
        await TaskService_1.TaskService.reorderTasks(userId, payload.items);
        (0, apiResponse_1.sendSuccess)(res, { message: 'Ordre des taches mis a jour.' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            return (0, apiResponse_1.sendError)(res, parseZodError(error), 400, 'VALIDATION_ERROR');
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.reorderTasks = reorderTasks;
const startTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const updated = await TaskService_1.TaskService.startTask(id, userId);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        const status = message === 'Task not found' ? 404 : 400;
        (0, apiResponse_1.sendError)(res, message, status, status === 404 ? 'TASK_NOT_FOUND' : 'BAD_REQUEST');
    }
};
exports.startTask = startTask;
const pauseTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const result = await TaskService_1.TaskService.pauseTask(id, userId);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        const status = message === 'Task not found' ? 404 : 400;
        (0, apiResponse_1.sendError)(res, message, status, status === 404 ? 'TASK_NOT_FOUND' : 'BAD_REQUEST');
    }
};
exports.pauseTask = pauseTask;
const completeTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const updated = await TaskService_1.TaskService.completeTask(id, userId);
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        const status = message === 'Task not found' ? 404 : 400;
        (0, apiResponse_1.sendError)(res, message, status, status === 404 ? 'TASK_NOT_FOUND' : 'BAD_REQUEST');
    }
};
exports.completeTask = completeTask;
const getCurrentFocusTask = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const task = await db_1.db.task.findFirst({
            where: { userId, startedAt: { not: null }, isDeleted: false },
            orderBy: { startedAt: 'desc' }
        });
        (0, apiResponse_1.sendSuccess)(res, task);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getCurrentFocusTask = getCurrentFocusTask;
