import { db } from '../lib/db';
import { NotFoundError, ForbiddenError } from '../errors/http.errors';

export interface EventSyncPayload {
    id: string;
    title?: string;
    description?: string | null;
    type?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    isAllDay?: boolean;
    location?: string | null;
    recurrence?: string | null;
    courseId?: string | null;
    localId?: string | null;
    version?: number;
}

const EVENT_TYPE_ALIAS_MAP: Record<string, any> = {
    LECTURE: 'CLASS',
    CLASSROOM: 'CLASS',
    COURS: 'CLASS',
    COURSE: 'CLASS',
    TEST: 'QUIZ',
    HOMEWORK: 'ASSIGNMENT',
    DEVOIR: 'ASSIGNMENT',
    OTHER: 'AUTRE'
};

const EVENT_TYPE_VALUES = new Set<string>([
    'CLASS', 'EXAM', 'EXAMEN', 'INTERRO', 'TP', 'QUIZ', 
    'ASSIGNMENT', 'STUDY', 'AUTRE', 'PERSONAL', 'MEETING'
]);

export class EventSyncService {
    private static normalizeEventType(value: any): any {
        const raw = String(value || '').trim().toUpperCase();
        const normalized = EVENT_TYPE_ALIAS_MAP[raw] || raw;
        return EVENT_TYPE_VALUES.has(normalized) ? normalized : 'CLASS';
    }

    static async push(payload: EventSyncPayload, userId: string, type: 'CREATE' | 'UPDATE' | 'DELETE'): Promise<any> {
        if (type === 'DELETE') {
            const existing = await db.event.findUnique({ where: { id: payload.id }, select: { userId: true } });
            if (!existing) return { id: payload.id };
            if (existing.userId !== userId) throw new ForbiddenError();
            
            await db.event.delete({ where: { id: payload.id } });
            return { id: payload.id };
        }

        // Validate Course Ownership
        let courseId = payload.courseId;
        if (courseId) {
            const course = await db.course.findUnique({ where: { id: courseId }, select: { userId: true } });
            if (!course || course.userId !== userId) courseId = null;
        }

        const data: any = {
            userId,
            title: payload.title,
            description: payload.description,
            type: this.normalizeEventType(payload.type),
            startDate: payload.startDate ? new Date(payload.startDate) : undefined,
            endDate: payload.endDate ? new Date(payload.endDate) : undefined,
            isAllDay: payload.isAllDay,
            location: payload.location,
            recurrence: payload.recurrence,
            courseId,
            version: payload.version ? { increment: 1 } : 1,
            syncStatus: 'SYNCED',
            lastModifiedAt: new Date()
        };

        // Remove undefined fields for update
        if (type === 'UPDATE') {
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
        }

        const result = await db.event.upsert({
            where: { id: payload.id },
            create: { id: payload.id, ...data, version: 1 },
            update: data
        });

        return result;
    }

    static async pull(userId: string, since: Date) {
        return db.event.findMany({
            where: {
                userId,
                lastModifiedAt: { gt: since }
            }
        });
    }
}
