import { db } from '../lib/db';
import { ForbiddenError, ValidationError } from '../errors/http.errors';
import { normalizeWorkTypes } from './courseWorkTypeService';

export interface CourseSyncPayload {
    id: string;
    code?: string;
    name?: string;
    description?: string | null;
    color?: string;
    credits?: number | null;
    isDeleted?: boolean;
    workTypes?: any[];
    version?: number;
}

export class CourseSyncService {
    static async push(payload: CourseSyncPayload, userId: string, type: 'CREATE' | 'UPDATE' | 'DELETE') {
        const existing = await db.course.findUnique({ where: { id: payload.id }, select: { userId: true } });
        
        if (type === 'DELETE' || payload.isDeleted) {
            if (!existing) return { id: payload.id };
            if (existing.userId !== userId) throw new ForbiddenError();
            
            await db.course.update({
                where: { id: payload.id },
                data: { isDeleted: true, deletedAt: new Date(), syncStatus: 'SYNCED' }
            });
            return { id: payload.id };
        }

        if (existing && existing.userId !== userId) throw new ForbiddenError();

        const data: any = {
            userId,
            code: payload.code,
            name: payload.name,
            description: payload.description,
            color: payload.color,
            credits: payload.credits,
            syncStatus: 'SYNCED',
            updatedAt: new Date(),
            version: payload.version ? { increment: 1 } : 1
        };

        const result = await db.$transaction(async (tx: any) => {
            const course = await tx.course.upsert({
                where: { id: payload.id },
                create: { id: payload.id, ...data, version: 1 },
                update: data,
                include: { workTypes: true }
            });

            if (payload.workTypes !== undefined) {
                const normalized = normalizeWorkTypes(payload.workTypes);
                if (normalized.ok) {
                    await tx.courseWorkType.deleteMany({ where: { courseId: course.id } });
                    await tx.courseWorkType.createMany({
                        data: normalized.items.map((item: any) => ({
                            courseId: course.id,
                            type: item.type,
                            weightPercent: item.weightPercent
                        }))
                    });
                }
            } else if (course.workTypes.length === 0) {
                // Initialize default work types if none exist
                const defaults = normalizeWorkTypes();
                if (defaults.ok) {
                    await tx.courseWorkType.createMany({
                        data: defaults.items.map((item: any) => ({
                            courseId: course.id,
                            type: item.type,
                            weightPercent: item.weightPercent
                        }))
                    });
                }
            }

            return course;
        });

        return result;
    }

    static async pull(userId: string, since: Date) {
        return db.course.findMany({
            where: {
                userId,
                updatedAt: { gt: since }
            },
            include: { workTypes: true }
        });
    }
}
