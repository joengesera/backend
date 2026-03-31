import { Request, Response } from 'express';
import { db } from '../lib/db';

const getUserId = (req: Request) => (req as any).user?.userId as string | undefined;

const toDateOrUndefined = (value: unknown) => {
    if (!value) return undefined;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const roundMinutesFromMs = (ms: number) => Math.max(0, Math.round(ms / 60000));
const roundSecondsFromMs = (ms: number) => Math.max(0, Math.round(ms / 1000));

export const getTasks = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const { courseId, eventId } = req.query;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const where: any = { userId, isDeleted: false };
        if (courseId) where.courseId = String(courseId);
        if (eventId) where.eventId = String(eventId);

        const tasks = await db.task.findMany({
            where,
            orderBy: [{ position: 'asc' }, { dueDate: 'asc' }]
        });
        res.json(tasks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createTask = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const { title, description, status, priority, dueDate, courseId, eventId, durationMinutes } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        if (!title) return res.status(400).json({ error: "Title is required" });
        if (durationMinutes !== undefined && Number(durationMinutes) <= 0) {
            return res.status(400).json({ error: "durationMinutes must be > 0" });
        }

        if (eventId) {
            const event = await db.event.findUnique({ where: { id: String(eventId) } });
            if (!event || event.userId !== userId) return res.status(404).json({ error: "Event not found" });
        }

        const maxPositionTask = await db.task.findFirst({
            where: { userId, eventId: eventId ? String(eventId) : null, isDeleted: false },
            orderBy: { position: 'desc' },
            select: { position: true }
        });

        const task = await db.task.create({
            data: {
                userId,
                title,
                description,
                status,
                priority,
                dueDate: toDateOrUndefined(dueDate),
                courseId,
                eventId: eventId ? String(eventId) : undefined,
                durationMinutes: durationMinutes ?? undefined,
                position: (maxPositionTask?.position ?? -1) + 1
            }
        });
        res.status(201).json(task);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        const data = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const task = await db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId) {
            return res.status(404).json({ error: "Task not found" });
        }

        if (data.dueDate) {
            const parsed = toDateOrUndefined(data.dueDate);
            if (!parsed) return res.status(400).json({ error: "Invalid dueDate" });
            data.dueDate = parsed;
        }
        if (data.durationMinutes !== undefined && Number(data.durationMinutes) <= 0) {
            return res.status(400).json({ error: "durationMinutes must be > 0" });
        }
        if (data.eventId) {
            const event = await db.event.findUnique({ where: { id: String(data.eventId) } });
            if (!event || event.userId !== userId) return res.status(404).json({ error: "Event not found" });
        }

        const updated = await db.task.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteTask = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const task = await db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId) {
            return res.status(404).json({ error: "Task not found" });
        }

        await db.task.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        res.json({ message: "Task deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getBoardTasks = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const { from, to } = req.query;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const where: any = { userId };
        if (from || to) {
            where.startDate = {};
            const fromDate = toDateOrUndefined(from);
            const toDate = toDateOrUndefined(to);
            if (from && !fromDate) return res.status(400).json({ error: "Invalid from date" });
            if (to && !toDate) return res.status(400).json({ error: "Invalid to date" });
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

        res.json(events);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getTasksByEvent = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const eventId = String(req.params.eventId);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const event = await db.event.findUnique({ where: { id: eventId } });
        if (!event || event.userId !== userId) {
            return res.status(404).json({ error: "Event not found" });
        }

        const tasks = await db.task.findMany({
            where: { userId, eventId, isDeleted: false },
            orderBy: [{ position: 'asc' }, { dueDate: 'asc' }]
        });

        res.json(tasks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createTaskForEvent = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const eventId = String(req.params.eventId);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const event = await db.event.findUnique({ where: { id: eventId } });
        if (!event || event.userId !== userId) {
            return res.status(404).json({ error: "Event not found" });
        }

        const { title, description, priority, dueDate, durationMinutes, courseId } = req.body;
        if (!title) return res.status(400).json({ error: "Title is required" });
        if (durationMinutes !== undefined && Number(durationMinutes) <= 0) {
            return res.status(400).json({ error: "durationMinutes must be > 0" });
        }

        const last = await db.task.findFirst({
            where: { userId, eventId, isDeleted: false },
            orderBy: { position: 'desc' },
            select: { position: true }
        });

        const task = await db.task.create({
            data: {
                userId,
                eventId,
                title,
                description,
                priority,
                dueDate: toDateOrUndefined(dueDate),
                durationMinutes: durationMinutes ?? undefined,
                courseId: courseId ?? event.courseId ?? undefined,
                position: (last?.position ?? -1) + 1
            }
        });

        res.status(201).json(task);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const reorderTasks = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const items = req.body?.items as Array<{ taskId: string; eventId: string | null; position: number }>;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "items is required" });
        }

        const taskIds = items.map((item) => String(item.taskId));
        const ownedTasks = await db.task.findMany({
            where: { id: { in: taskIds }, userId },
            select: { id: true }
        });
        if (ownedTasks.length !== taskIds.length) {
            return res.status(403).json({ error: "Forbidden task in payload" });
        }

        const eventIds = Array.from(new Set(items.map((item) => item.eventId).filter(Boolean))) as string[];
        if (eventIds.length > 0) {
            const ownedEvents = await db.event.findMany({
                where: { id: { in: eventIds }, userId },
                select: { id: true }
            });
            if (ownedEvents.length !== eventIds.length) {
                return res.status(403).json({ error: "Forbidden event in payload" });
            }
        }

        await db.$transaction(
            items.map((item) =>
                db.task.update({
                    where: { id: String(item.taskId) },
                    data: {
                        eventId: item.eventId ? String(item.eventId) : null,
                        position: Number(item.position),
                        updatedAt: new Date()
                    }
                })
            )
        );

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const startTask = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const task = await db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId || task.isDeleted) {
            return res.status(404).json({ error: "Task not found" });
        }

        const active = await db.task.findFirst({
            where: { userId, startedAt: { not: null }, isDeleted: false }
        });
        if (active && active.id !== id) {
            return res.status(400).json({ error: "Another task is already running" });
        }

        const now = new Date();
        const updated = await db.task.update({
            where: { id },
            data: { startedAt: now, status: 'IN_PROGRESS', updatedAt: now }
        });

        await db.taskSession.create({
            data: { taskId: id, startedAt: now }
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const pauseTask = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const task = await db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId || task.isDeleted) {
            return res.status(404).json({ error: "Task not found" });
        }
        if (!task.startedAt) {
            return res.status(400).json({ error: "Task is not running" });
        }

        const now = new Date();
        const diffMs = now.getTime() - new Date(task.startedAt).getTime();
        const addedMinutes = roundMinutesFromMs(diffMs);

        const updated = await db.task.update({
            where: { id },
            data: {
                startedAt: null,
                timeSpentMinutes: (task.timeSpentMinutes || 0) + addedMinutes,
                updatedAt: now
            }
        });

        const openSession = await db.taskSession.findFirst({
            where: { taskId: id, endDate: null },
            orderBy: { startedAt: 'desc' }
        });
        if (openSession) {
            await db.taskSession.update({
                where: { id: openSession.id },
                data: { endDate: now, durationSeconds: roundSecondsFromMs(diffMs) }
            });
        }

        res.json({
            success: true,
            data: {
                taskId: id,
                addedMinutes,
                timeSpentMinutes: updated.timeSpentMinutes
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const completeTask = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const task = await db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId || task.isDeleted) {
            return res.status(404).json({ error: "Task not found" });
        }

        const now = new Date();
        let addedMinutes = 0;

        if (task.startedAt) {
            const diffMs = now.getTime() - new Date(task.startedAt).getTime();
            addedMinutes = roundMinutesFromMs(diffMs);

            const openSession = await db.taskSession.findFirst({
                where: { taskId: id, endDate: null },
                orderBy: { startedAt: 'desc' }
            });
            if (openSession) {
                await db.taskSession.update({
                    where: { id: openSession.id },
                    data: { endDate: now, durationSeconds: roundSecondsFromMs(diffMs) }
                });
            }
        }

        const updated = await db.task.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: now,
                startedAt: null,
                timeSpentMinutes: (task.timeSpentMinutes || 0) + addedMinutes,
                updatedAt: now
            }
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getCurrentFocusTask = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const task = await db.task.findFirst({
            where: { userId, startedAt: { not: null }, isDeleted: false },
            orderBy: { startedAt: 'desc' }
        });

        res.json(task);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
