import { db } from '../lib/db';
import { ForbiddenError, ValidationError } from '../errors/http.errors';

export interface GradeSyncPayload {
    id: string;
    name?: string;
    score: number;
    maxScore?: number;
    percentage?: number | null;
    courseId: string;
    workId?: string | null;
    workTypeLabel?: string | null;
    workTypeId?: string | null;
    date?: string | Date | null;
    comment?: string | null;
    version?: number;
}

export class GradeSyncService {
    static async validateAndNormalize(payload: GradeSyncPayload, userId: string) {
        // Validate Course
        const course = await db.course.findUnique({
            where: { id: payload.courseId },
            select: { userId: true }
        });
        if (!course) throw new ValidationError('Cours introuvable');
        if (course.userId !== userId) throw new ForbiddenError();

        // Validate Score
        const maxScore = payload.maxScore ?? 20;
        if (maxScore <= 0) throw new ValidationError('Le score maximum doit être supérieur à 0');
        if (payload.score < 0 || payload.score > maxScore) {
            throw new ValidationError(`Le score (${payload.score}) doit être entre 0 et ${maxScore}`);
        }

        // Validate Work if present
        let workTypeId = payload.workTypeId;
        if (payload.workId) {
            const work = await db.work.findUnique({
                where: { id: payload.workId },
                select: { userId: true, courseId: true, workTypeId: true }
            });
            if (!work || work.userId !== userId) throw new ValidationError('Travail introuvable');
            if (work.courseId !== payload.courseId) throw new ValidationError('Le travail doit appartenir au même cours');
            workTypeId = workTypeId || work.workTypeId;
        }

        return {
            ...payload,
            maxScore,
            workTypeId,
            date: payload.date ? new Date(payload.date) : null
        };
    }

    static async push(payload: GradeSyncPayload, userId: string, type: 'CREATE' | 'UPDATE' | 'DELETE') {
        if (type === 'DELETE') {
            const existing = await db.grade.findUnique({ where: { id: payload.id }, select: { userId: true } });
            if (!existing) return { id: payload.id };
            if (existing.userId !== userId) throw new ForbiddenError();
            await db.grade.delete({ where: { id: payload.id } });
            return { id: payload.id };
        }

        const normalized = await this.validateAndNormalize(payload, userId);

        const data: any = {
            userId,
            courseId: normalized.courseId,
            name: normalized.name || 'Note',
            score: normalized.score,
            maxScore: normalized.maxScore,
            percentage: normalized.percentage,
            workId: normalized.workId,
            workTypeId: normalized.workTypeId,
            workTypeLabel: normalized.workTypeLabel,
            date: normalized.date,
            comment: normalized.comment,
            syncStatus: 'SYNCED',
            lastModifiedAt: new Date(),
            version: payload.version ? { increment: 1 } : 1
        };

        const result = await db.grade.upsert({
            where: { id: payload.id },
            create: { id: payload.id, ...data, version: 1 },
            update: data,
            include: {
                workType: { select: { type: true, weightPercent: true } },
                work: { select: { id: true, title: true } }
            }
        });

        return result;
    }

    static async pull(userId: string, since: Date) {
        return db.grade.findMany({
            where: {
                userId,
                lastModifiedAt: { gt: since }
            },
            include: {
                workType: { select: { type: true, weightPercent: true } },
                work: { select: { id: true, title: true } }
            }
        });
    }
}
