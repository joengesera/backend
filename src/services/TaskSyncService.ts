/**
 * TaskSyncService — synchronisation offline-first des tasks.
 * CORRECTIFS:
 * - ensureTaskDefaults: updateMany à la place de N updates en transaction
 * - mergeTaskStates: retour typé sans cast non sûr
 * - syncPushTask: validation de titre cohérente entre CREATE et UPDATE
 * - types explicites à la place de any
 */

import { db } from '../lib/db';
import { Task } from '@prisma/client';

export interface TaskSyncPayload {
    id: string;
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    dueDate?: string | null;
    courseId?: string | null;
    eventId?: string | null;
    durationMinutes?: number | null;
    timeSpentMinutes?: number;
    position?: number;
    startedAt?: string | null;
    localId?: string | null;
    syncStatus?: string;
    version?: number;
}

export interface TaskSyncResponse {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
    courseId: string | null;
    eventId: string | null;
    durationMinutes: number | null;
    timeSpentMinutes: number;
    position: number;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    localId: string | null;
    version: number;
    syncStatus: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UuidResult =
    | { ok: true; value: string | null | undefined }
    | { ok: false; error: string };

const normalizeOptionalUuid = (value: string | null | undefined): UuidResult => {
    if (value === undefined) return { ok: true, value: undefined };
    if (value === null || value === '') return { ok: true, value: null };
    if (!UUID_REGEX.test(value)) return { ok: false, error: 'Format identifiant invalide' };
    return { ok: true, value };
};

export function mapTaskToSync(task: Task): TaskSyncResponse {
    return {
        id: task.id,
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate?.toISOString() ?? null,
        courseId: task.courseId ?? null,
        eventId: task.eventId ?? null,
        durationMinutes: task.durationMinutes ?? null,
        timeSpentMinutes: task.timeSpentMinutes,
        position: task.position,
        startedAt: task.startedAt?.toISOString() ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        localId: task.localId ?? null,
        version: task.version,
        syncStatus: task.syncStatus,
    };
}

function mapSyncToTask(
    payload: TaskSyncPayload,
    userId: string,
    existingTask: Task | null
): Omit<Task, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        userId,
        title: payload.title ?? existingTask?.title ?? '',
        description:
            payload.description !== undefined ? payload.description ?? null : existingTask?.description ?? null,
        status: (payload.status ?? existingTask?.status ?? 'PENDING') as Task['status'],
        priority: (payload.priority ?? existingTask?.priority ?? 'MEDIUM') as Task['priority'],
        dueDate:
            payload.dueDate !== undefined
                ? payload.dueDate ? new Date(payload.dueDate) : null
                : existingTask?.dueDate ?? null,
        courseId:
            payload.courseId !== undefined ? payload.courseId ?? null : existingTask?.courseId ?? null,
        eventId:
            payload.eventId !== undefined ? payload.eventId ?? null : existingTask?.eventId ?? null,
        durationMinutes:
            payload.durationMinutes !== undefined
                ? payload.durationMinutes ?? null
                : existingTask?.durationMinutes ?? null,
        timeSpentMinutes: payload.timeSpentMinutes ?? existingTask?.timeSpentMinutes ?? 0,
        position: payload.position ?? existingTask?.position ?? 0,
        startedAt:
            payload.startedAt !== undefined
                ? payload.startedAt ? new Date(payload.startedAt) : null
                : existingTask?.startedAt ?? null,
        completedAt: existingTask?.completedAt ?? null,
        localId: payload.localId ?? existingTask?.localId ?? null,
        syncStatus: 'SYNCED' as Task['syncStatus'],
        lastModifiedAt: new Date(),
        version: (payload.version ?? existingTask?.version ?? 0) + 1,
        isDeleted: existingTask?.isDeleted ?? false,
        deletedAt: existingTask?.deletedAt ?? null,
    };
}

/**
 * CORRECTIF: updateMany à la place de N updates séparés en transaction.
 * Plus efficace : une seule requête SQL.
 */
export async function ensureTaskDefaults(userId: string): Promise<{ updated: number }> {
    const result = await db.task.updateMany({
        where: {
            userId,
            OR: [
                { timeSpentMinutes: 0, position: 0 },
            ],
        },
        data: {
            timeSpentMinutes: 0,
            position: 0,
            lastModifiedAt: new Date(),
        },
    });

    return { updated: result.count };
}

export async function syncPushTask(
    payload: TaskSyncPayload,
    userId: string,
    type: 'CREATE' | 'UPDATE'
): Promise<{ success: boolean; data?: TaskSyncResponse; error?: string }> {
    try {
        const normalizedEventId = normalizeOptionalUuid(payload.eventId);
        if (!normalizedEventId.ok) return { success: false, error: 'eventId invalide' };

        const normalizedCourseId = normalizeOptionalUuid(payload.courseId);
        if (!normalizedCourseId.ok) return { success: false, error: 'courseId invalide' };

        // CORRECTIF: validation de titre uniforme pour CREATE et UPDATE
        const title = payload.title?.trim();
        if (type === 'CREATE' && !title) {
            return { success: false, error: 'Le titre est requis pour la création.' };
        }

        const existingTask = await db.task.findUnique({ where: { id: payload.id } });

        if (existingTask && existingTask.userId !== userId) {
            return { success: false, error: 'Tâche introuvable ou accès refusé.' };
        }
        if (type === 'UPDATE' && !existingTask && !title) {
            return { success: false, error: 'Le titre est requis pour créer une tâche manquante via update.' };
        }

        // Validation silencieuse des références — on nullifie au lieu de rejeter
        let validEventId = normalizedEventId.value as string | null | undefined;
        let validCourseId = normalizedCourseId.value as string | null | undefined;

        if (validEventId) {
            const event = await db.event.findUnique({ where: { id: validEventId }, select: { userId: true } });
            if (!event || event.userId !== userId) validEventId = null;
        }
        if (validCourseId) {
            const course = await db.course.findUnique({ where: { id: validCourseId }, select: { userId: true } });
            if (!course || course.userId !== userId) validCourseId = null;
        }

        const validatedPayload: TaskSyncPayload = {
            ...payload,
            eventId: validEventId,
            courseId: validCourseId,
        };

        const syncData = mapSyncToTask(validatedPayload, userId, existingTask);

        const task = await db.task.upsert({
            where: { id: payload.id },
            update: syncData,
            create: { id: payload.id, ...syncData },
        });

        return { success: true, data: mapTaskToSync(task) };
    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Sync push échoué',
        };
    }
}

export async function syncDeleteTask(
    taskId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const task = await db.task.findUnique({ where: { id: taskId }, select: { userId: true } });
        if (!task || task.userId !== userId) {
            return { success: false, error: 'Tâche introuvable ou accès refusé.' };
        }

        await db.task.update({
            where: { id: taskId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                syncStatus: 'SYNCED',
                lastModifiedAt: new Date(),
            },
        });

        return { success: true };
    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Sync delete échoué',
        };
    }
}

export async function syncPullTasks(userId: string, lastPulledAt: Date): Promise<TaskSyncResponse[]> {
    const tasks = await db.task.findMany({
        where: { userId, lastModifiedAt: { gt: lastPulledAt } },
        orderBy: { lastModifiedAt: 'desc' },
    });
    return tasks.map(mapTaskToSync);
}

/**
 * CORRECTIF: retour typé sans cast non sûr (as TaskSyncResponse).
 * Si local est PENDING, on merge champ par champ de façon explicite.
 */
export function mergeTaskStates(
    local: TaskSyncPayload,
    remote: TaskSyncResponse
): TaskSyncResponse {
    if (local.syncStatus === 'PENDING') {
        return {
            id: local.id ?? remote.id,
            title: local.title ?? remote.title,
            description: local.description !== undefined ? local.description ?? null : remote.description,
            status: local.status ?? remote.status,
            priority: local.priority ?? remote.priority,
            dueDate: local.dueDate !== undefined ? local.dueDate ?? null : remote.dueDate,
            courseId: local.courseId !== undefined ? local.courseId ?? null : remote.courseId,
            eventId: local.eventId !== undefined ? local.eventId ?? null : remote.eventId,
            durationMinutes:
                local.durationMinutes !== undefined ? local.durationMinutes ?? null : remote.durationMinutes,
            timeSpentMinutes: local.timeSpentMinutes ?? remote.timeSpentMinutes,
            position: local.position ?? remote.position,
            startedAt: local.startedAt !== undefined ? local.startedAt ?? null : remote.startedAt,
            completedAt: remote.completedAt,
            createdAt: remote.createdAt,
            updatedAt: remote.updatedAt,
            localId: local.localId !== undefined ? local.localId ?? null : remote.localId,
            version: local.version ?? remote.version,
            syncStatus: 'PENDING',
        };
    }

    return remote;
}

export function ensureTaskCompatibility(task: Partial<TaskSyncResponse>): TaskSyncResponse {
    const now = new Date().toISOString();
    return {
        id: task.id!,
        title: task.title!,
        description: task.description ?? null,
        status: task.status ?? 'PENDING',
        priority: task.priority ?? 'MEDIUM',
        dueDate: task.dueDate ?? null,
        courseId: task.courseId ?? null,
        eventId: task.eventId ?? null,
        durationMinutes: task.durationMinutes ?? null,
        timeSpentMinutes: task.timeSpentMinutes ?? 0,
        position: task.position ?? 0,
        startedAt: task.startedAt ?? null,
        completedAt: task.completedAt ?? null,
        createdAt: task.createdAt ?? now,
        updatedAt: task.updatedAt ?? now,
        localId: task.localId ?? null,
        version: task.version ?? 1,
        syncStatus: task.syncStatus ?? 'SYNCED',
    };
}