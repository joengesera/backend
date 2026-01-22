"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getEvents = void 0;
const db_1 = require("../lib/db");
const getEvents = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { startDate, endDate } = req.query;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
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
        res.json(events);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getEvents = getEvents;
const createEvent = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { title, description, type, startDate, endDate, isAllDay, location, recurrence, courseId } = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const event = await db_1.db.event.create({
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
        res.status(201).json(event);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.createEvent = createEvent;
const updateEvent = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const data = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const event = await db_1.db.event.findUnique({ where: { id } });
        if (!event || event.userId !== userId) {
            return res.status(404).json({ error: "Event not found" });
        }
        if (data.startDate)
            data.startDate = new Date(data.startDate);
        if (data.endDate)
            data.endDate = new Date(data.endDate);
        const updated = await db_1.db.event.update({
            where: { id },
            data: { ...data } // Events don't have updatedAt in standard schemas usually, but ours might? let's check schema/types if needed. Schema says "lastModifiedAt"
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updateEvent = updateEvent;
const deleteEvent = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const event = await db_1.db.event.findUnique({ where: { id } });
        if (!event || event.userId !== userId) {
            return res.status(404).json({ error: "Event not found" });
        }
        await db_1.db.event.delete({ where: { id } }); // Hard delete for events as per typical calendar behavior, or we could add soft delete if schema supports it. Schema has no isDeleted for Events, so Hard delete.
        res.json({ message: "Event deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteEvent = deleteEvent;
