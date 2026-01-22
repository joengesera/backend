import { Request, Response } from 'express';
import { db } from '../lib/db';

export const getCourses = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId; // Assumes auth middleware adds user to req
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const courses = await db.course.findMany({
            where: { userId, isDeleted: false }
        });
        res.json(courses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createCourse = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { code, name, description, color, credits } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const course = await db.course.create({
            data: {
                userId,
                code,
                name,
                description,
                color,
                credits
            }
        });
        res.status(201).json(course);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateCourse = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const id = String(req.params.id);
        const data = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const course = await db.course.findUnique({ where: { id } });
        if (!course || course.userId !== userId) {
            return res.status(404).json({ error: "Course not found" });
        }

        const updated = await db.course.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteCourse = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const id = String(req.params.id);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const course = await db.course.findUnique({ where: { id } });
        if (!course || course.userId !== userId) {
            return res.status(404).json({ error: "Course not found" });
        }

        // Soft delete
        await db.course.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        res.json({ message: "Course deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
