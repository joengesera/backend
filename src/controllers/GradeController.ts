import { Request, Response } from 'express';
import { db } from '../lib/db';
import { GradeService } from '../services/GradeService';

export const getGrades = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { courseId } = req.query;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const where: any = { userId };
        if (courseId) where.courseId = String(courseId);

        const grades = await db.grade.findMany({ where, orderBy: { date: 'desc' } });
        res.json(grades);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createGrade = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { name, score, maxScore, weight, date, comment, courseId } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const grade = await db.grade.create({
            data: {
                userId,
                name,
                score,
                maxScore: maxScore || 20,
                weight: weight || 1.0,
                date: date ? new Date(date) : undefined,
                comment,
                courseId
            }
        });
        res.status(201).json(grade);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateGrade = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params as { id: string };
        const data = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const grade = await db.grade.findUnique({ where: { id } });
        if (!grade || grade.userId !== userId) {
            return res.status(404).json({ error: "Grade not found" });
        }

        if (data.date) data.date = new Date(data.date);

        const updated = await db.grade.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteGrade = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params as { id: string };

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const grade = await db.grade.findUnique({ where: { id } });
        if (!grade || grade.userId !== userId) {
            return res.status(404).json({ error: "Grade not found" });
        }

        await db.grade.delete({ where: { id } }); 
        res.json({ message: "Grade deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getGeneralAverage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await GradeService.getGeneralAverage(userId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getCourseAverage = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const courseId = req.params.courseId as string;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await GradeService.getCourseAverage(userId, courseId);
        
        if (!result) {
            return res.status(404).json({ error: "No grades found for this course" });
        }

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getGradeStatistics = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await GradeService.getGradeStatistics(userId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
