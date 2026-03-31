import { Request, Response } from 'express';
import { db } from '../lib/db';

export const getEvents = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { startDate, endDate } = req.query;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const where: any = { userId };
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
        res.json(events);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const {
            title,
            description,
            type,
            startDate,
            endDate,
            isAllDay,
            location,
            recurrence,
            courseId,
            generateDefaultTasks
        } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const event = await db.$transaction(async (tx) => {
            const createdEvent = await tx.event.create({
                data: {
                    userId,
                    title,
                    description,
                    type,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    isAllDay: isAllDay || false,
                    location,
                    recurrence,
                    courseId
                }
            });

            if (generateDefaultTasks === true) {
                const templates = [
                    { title: 'Preparer le plan de revision', durationMinutes: 25 },
                    { title: 'Reviser les chapitres cles', durationMinutes: 45 },
                    { title: 'Faire un entrainement', durationMinutes: 60 },
                    { title: 'Relecture finale', durationMinutes: 25 }
                ];

                await tx.task.createMany({
                    data: templates.map((item, index) => ({
                        userId,
                        eventId: createdEvent.id,
                        courseId: courseId ?? null,
                        title: item.title,
                        durationMinutes: item.durationMinutes,
                        position: index
                    }))
                });
            }

            return createdEvent;
        });

        res.status(201).json(event);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params as any;
        const data = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const event = await db.event.findUnique({ where: { id } });
        if (!event || event.userId !== userId) {
            return res.status(404).json({ error: "Event not found" });
        }

        if (data.startDate) data.startDate = new Date(data.startDate);
        if (data.endDate) data.endDate = new Date(data.endDate);

        const updated = await db.event.update({
            where: { id },
            data: { ...data } // Events don't have updatedAt in standard schemas usually, but ours might? let's check schema/types if needed. Schema says "lastModifiedAt"
        });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params as any;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const event = await db.event.findUnique({ where: { id } });
        if (!event || event.userId !== userId) {
            return res.status(404).json({ error: "Event not found" });
        }

        await db.event.delete({ where: { id } }); // Hard delete for events as per typical calendar behavior, or we could add soft delete if schema supports it. Schema has no isDeleted for Events, so Hard delete.
        res.json({ message: "Event deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
