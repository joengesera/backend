import { db } from '../lib/db';
import { WorkService } from './WorkService';
import { ForbiddenError, ValidationError } from '../errors/http.errors';

export interface WorkSyncPayload {
    id: string;
    title?: string;
    description?: string | null;
    status?: any;
    dueDate?: string | Date | null;
    submittedAt?: string | Date | null;
    gradedAt?: string | Date | null;
    pointsEarned?: number | null;
    pointsPossible?: number;
    courseId: string;
    eventId?: string | null;
    workTypeId?: string | null;
    workTypeLabel?: string | null;
    comment?: string | null;
    version?: number;
}

export class WorkSyncService {
    static async validateAndNormalize(payload: WorkSyncPayload, userId: string) {
        // Course validation
        const course = await db.course.findUnique({
            where: { id: payload.courseId },
            select: { userId: true }
        });
        if (!course) throw new ValidationError('Cours introuvable');
        if (course.userId !== userId) throw new ForbiddenError();

        // Event validation
        if (payload.eventId) {
            const event = await db.event.findUnique({
                where: { id: payload.eventId },
                select: { userId: true }
            });
            if (!event || event.userId !== userId) throw new ValidationError('Événement introuvable');
        }

        const pointsPossible = payload.pointsPossible ?? 20;
        const pointsEarned = payload.pointsEarned ?? null;
        const rangeError = WorkService.validatePointsRange(pointsEarned, pointsPossible);
        if (rangeError) throw new ValidationError(rangeError);

        return {
            ...payload,
            pointsPossible,
            pointsEarned,
            dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
            submittedAt: payload.submittedAt ? new Date(payload.submittedAt) : null,
            gradedAt: payload.gradedAt ? new Date(payload.gradedAt) : null
        };
    }

    static async push(payload: WorkSyncPayload, userId: string, type: 'CREATE' | 'UPDATE' | 'DELETE') {
        if (type === 'DELETE') {
            const existing = await db.work.findUnique({ where: { id: payload.id }, select: { userId: true } });
            if (!existing) return { id: payload.id };
            if (existing.userId !== userId) throw new ForbiddenError();
            await db.work.delete({ where: { id: payload.id } });
            return { id: payload.id };
        }

        const normalized = await this.validateAndNormalize(payload, userId);

        const data: any = {
            userId,
            courseId: normalized.courseId,
            eventId: normalized.eventId,
            title: normalized.title || 'Travail',
            description: normalized.description,
            status: normalized.status || 'PLANNED',
            dueDate: normalized.dueDate,
            submittedAt: normalized.submittedAt,
            gradedAt: normalized.gradedAt,
            pointsEarned: normalized.pointsEarned,
            pointsPossible: normalized.pointsPossible,
            workTypeId: normalized.workTypeId,
            workTypeLabel: normalized.workTypeLabel,
            comment: normalized.comment,
            syncStatus: 'SYNCED',
            lastModifiedAt: new Date(),
            version: payload.version ? { increment: 1 } : 1
        };

        const result = await db.work.upsert({
            where: { id: payload.id },
            create: { id: payload.id, ...data, version: 1 },
            update: data,
            include: {
                workType: { select: { type: true, weightPercent: true } }
            }
        });

        return result;
    }

    static async pull(userId: string, since: Date) {
        return db.work.findMany({
            where: {
                userId,
                lastModifiedAt: { gt: since }
            },
            include: {
                workType: { select: { type: true, weightPercent: true } }
            }
        });
    }
}
