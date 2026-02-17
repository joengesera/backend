"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.createTask = exports.getTasks = void 0;
const db_1 = require("../lib/db");
const getTasks = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { courseId } = req.query;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const where = { userId, isDeleted: false, };
        if (courseId)
            where.courseId = String(courseId);
        const tasks = await db_1.db.task.findMany({
            where: {
                userId: userId,
                isDeleted: false,
                ...courseId && { courseId: String(courseId) }
            },
            orderBy: {
                dueDate: 'asc'
            }
        });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getTasks = getTasks;
const createTask = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { title, description, status, priority, dueDate, courseId } = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const task = await db_1.db.task.create({
            data: {
                userId,
                title,
                description,
                status,
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                courseId
            }
        });
        res.status(201).json(task);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.createTask = createTask;
const updateTask = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = String(req.params.id);
        const data = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const task = await db_1.db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId) {
            return res.status(404).json({ error: "Task not found" });
        }
        if (data.dueDate)
            data.dueDate = new Date(data.dueDate);
        const updated = await db_1.db.task.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = String(req.params.id);
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const task = await db_1.db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId) {
            return res.status(404).json({ error: "Task not found" });
        }
        await db_1.db.task.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        res.json({ message: "Task deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteTask = deleteTask;
