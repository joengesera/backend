import { Request, Response } from 'express';
import { db } from '../lib/db';

export const getTasks = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { courseId } = req.query;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const where: any = { userId, isDeleted: false, };
        if (courseId) where.courseId = String(courseId);

        const tasks = await db.task.findMany({
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
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createTask = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { title, description, status, priority, dueDate, courseId } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const task = await db.task.create({
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
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTask = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const id = String(req.params.id);
        const data = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const task = await db.task.findUnique({ where: { id } });
        if (!task || task.userId !== userId) {
            return res.status(404).json({ error: "Task not found" });
        }

        if (data.dueDate) data.dueDate = new Date(data.dueDate);

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
        const userId = (req as any).user?.userId;
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
