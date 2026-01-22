"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSyncPull = exports.handleSyncPush = void 0;
const db_1 = require("../lib/db");
const handleSyncPush = async (req, res) => {
    const { type, entity, data, userId } = req.body;
    const safeUserId = req.user?.userId;
    if (!safeUserId)
        return res.status(401).json({ error: "Unauthorized" });
    if (safeUserId !== userId)
        return res.status(403).json({ error: "Forbidden" });
    try {
        let result;
        const modelMap = {
            'Task': db_1.db.task,
            'Event': db_1.db.event,
            'Course': db_1.db.course,
            'Grade': db_1.db.grade
        };
        const model = modelMap[entity];
        if (!model)
            return res.status(400).json({ error: "Invalid entity" });
        // Push to History
        await db_1.db.syncHistory.create({
            data: {
                userId: safeUserId,
                deviceId: req.body.deviceId || 'unknown',
                syncType: 'PUSH',
                status: 'STARTED',
                itemsPushed: 1 // Single item for now
            }
        });
        if (type === 'CREATE' || type === 'UPDATE') {
            // Upsert Logic (Last Write Wins)
            // We need to handle IDs. If client generates UUIDs, we use them.
            // basic check to ensure data belongs to user
            const payload = { ...data, userId: safeUserId, syncStatus: 'SYNCED', lastModifiedAt: new Date() };
            // Remove meta fields that might cause issues if they don't match exactly or are read-only
            delete payload.createdAt;
            delete payload.updatedAt;
            // Date conversion
            if (payload.dueDate)
                payload.dueDate = new Date(payload.dueDate);
            if (payload.startDate)
                payload.startDate = new Date(payload.startDate);
            if (payload.endDate)
                payload.endDate = new Date(payload.endDate);
            if (payload.date)
                payload.date = new Date(payload.date);
            result = await model.upsert({
                where: { id: data.id },
                update: payload,
                create: payload
            });
        }
        else if (type === 'DELETE') {
            // Soft delete if possible, otherwise hard.
            // Our schema supports soft delete for Tasks, Courses. Not Events, Grades.
            if (entity === 'Task' || entity === 'Course') {
                result = await model.update({
                    where: { id: data.id },
                    data: { isDeleted: true, deletedAt: new Date(), syncStatus: 'SYNCED' }
                });
            }
            else {
                result = await model.delete({ where: { id: data.id } });
            }
        }
        res.status(200).json({ success: true, syncedAt: new Date() });
    }
    catch (error) {
        console.error("Sync Push Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.handleSyncPush = handleSyncPush;
const handleSyncPull = async (req, res) => {
    const safeUserId = req.user?.userId;
    if (!safeUserId)
        return res.status(401).json({ error: "Unauthorized" });
    if (safeUserId !== req.query.userId) {
        console.warn("Sync Pull Forbidden: userId mismatch");
        return res.status(403).json({ error: "Forbidden" });
    }
    const { lastPulledAt } = req.query;
    // Client sends the last time it pulled data. We return everything modified since then.
    try {
        const since = lastPulledAt ? new Date(String(lastPulledAt)) : new Date(0);
        const tasks = await db_1.db.task.findMany({ where: { userId: safeUserId, lastModifiedAt: { gt: since } } });
        const events = await db_1.db.event.findMany({ where: { userId: safeUserId, lastModifiedAt: { gt: since } } }); // Need to check if Event has lastModifiedAt
        const grades = await db_1.db.grade.findMany({ where: { userId: safeUserId, lastModifiedAt: { gt: since } } });
        const courses = await db_1.db.course.findMany({ where: { userId: safeUserId, updatedAt: { gt: since } } }); // Course uses updatedAt
        // Log history
        await db_1.db.syncHistory.create({
            data: {
                userId: safeUserId,
                deviceId: req.query.deviceId || 'unknown',
                syncType: 'PULL',
                status: 'COMPLETED',
                itemsPulled: tasks.length + events.length + grades.length + courses.length
            }
        });
        res.json({
            changes: {
                tasks,
                events,
                grades,
                courses
            },
            timestamp: new Date()
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.handleSyncPull = handleSyncPull;
