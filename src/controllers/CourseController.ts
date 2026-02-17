import { Request, Response } from 'express';
import { db } from '../lib/db';
import { normalizeWorkTypes } from '../services/courseWorkTypeService';

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
        const { code, name, description, color, credits, workTypes } = req.body;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const normalized = normalizeWorkTypes(workTypes);
        if (!normalized.ok) {
            return res.status(400).json({ error: normalized.error });
        }

        const course = await db.$transaction(async (tx) => {
            const created = await tx.course.create({
                data: {
                    userId,
                    code,
                    name,
                    description,
                    color,
                    credits
                }
            });

            await tx.courseWorkType.createMany({
                data: normalized.items.map((item) => ({
                    courseId: created.id,
                    type: item.type,
                    weightPercent: item.weightPercent
                }))
            });

            return created;
        });

        res.status(201).json(course);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getCourseWorkTypes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const courseId = String(req.params.id);

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const course = await db.course.findUnique({ where: { id: courseId } });
        if (!course || course.userId !== userId) {
            return res.status(404).json({ error: "Course not found" });
        }

        const workTypes = await db.courseWorkType.findMany({
            where: { courseId },
            orderBy: { type: 'asc' }
        });
        res.json(workTypes);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateCourseWorkTypes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const courseId = String(req.params.id);
        const { workTypes } = req.body as { workTypes?: unknown };

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const course = await db.course.findUnique({ where: { id: courseId } });
        if (!course || course.userId !== userId) {
            return res.status(404).json({ error: "Course not found" });
        }

        const normalized = normalizeWorkTypes(workTypes);
        if (!normalized.ok) {
            return res.status(400).json({ error: normalized.error });
        }

        const existing = await db.courseWorkType.findMany({ where: { courseId } });
        const keepTypes = new Set(normalized.items.map((item) => item.type));
        const toDelete = existing.filter((item) => !keepTypes.has(item.type));

        if (toDelete.length > 0) {
            const usedCount = await db.grade.count({
                where: { courseId, workTypeId: { in: toDelete.map((item) => item.id) } }
            });
            if (usedCount > 0) {
                return res.status(400).json({ error: "Impossible de supprimer un type déjà utilisé par des notes" });
            }
        }

        await db.$transaction([
            db.courseWorkType.deleteMany({
                where: { id: { in: toDelete.map((item) => item.id) } }
            }),
            ...normalized.items.map((item) =>
                db.courseWorkType.upsert({
                    where: { courseId_type: { courseId, type: item.type } },
                    update: { weightPercent: item.weightPercent },
                    create: { courseId, type: item.type, weightPercent: item.weightPercent }
                })
            )
        ]);

        const updated = await db.courseWorkType.findMany({
            where: { courseId },
            orderBy: { type: 'asc' }
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const initCourseWorkTypes = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const courses = await db.course.findMany({
            where: { userId, isDeleted: false },
            select: { id: true }
        });

        if (courses.length === 0) {
            return res.json({ created: 0 });
        }

        const courseIds = courses.map((course) => course.id);
        const existing = await db.courseWorkType.findMany({
            where: { courseId: { in: courseIds } },
            select: { courseId: true }
        });
        const existingSet = new Set(existing.map((item) => item.courseId));
        const missing = courseIds.filter((id) => !existingSet.has(id));

        if (missing.length === 0) {
            return res.json({ created: 0 });
        }

        const defaults = normalizeWorkTypes();
        if (!defaults.ok) {
            return res.status(500).json({ error: "Impossible d'initialiser les types de travaux" });
        }
        await db.courseWorkType.createMany({
            data: missing.flatMap((courseId) =>
                defaults.items.map((item) => ({
                    courseId,
                    type: item.type,
                    weightPercent: item.weightPercent
                }))
            )
        });

        res.json({ created: missing.length });
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
