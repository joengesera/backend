import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../lib/db';
import { catchAsync } from '../utils/catchAsync';
import { ValidationError, UnauthorizedError } from '../errors/http.errors';
import { logger } from '../utils/logger';
import { syncPushTask, syncDeleteTask, syncPullTasks, ensureTaskCompatibility } from '../services/TaskSyncService';
import { EventSyncService } from '../services/EventSyncService';
import { GradeSyncService } from '../services/GradeSyncService';
import { WorkSyncService } from '../services/WorkSyncService';
import { CourseSyncService } from '../services/CourseSyncService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown) => typeof value === 'string' && UUID_REGEX.test(value);
const isPrismaDataError = (error: any) => typeof error?.code === 'string' && /^P2\d{3}$/.test(error.code);

/**
 * Handle PUSH synchronization from client
 */
export const handleSyncPush = catchAsync(async (req: Request, res: Response) => {
    const { type, entity, data, deviceId } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) throw new UnauthorizedError();
    if (!isValidUuid(userId)) throw new UnauthorizedError('Token utilisateur invalide');
    if (!entity || !data?.id) throw new ValidationError('Entite ou ID manquant');
    if (!['CREATE', 'UPDATE', 'DELETE'].includes(type)) {
        throw new ValidationError('Type de synchronisation invalide');
    }

    const normalizedData = { ...data };
    if (!isValidUuid(normalizedData.id)) {
        if (type === 'CREATE') {
            normalizedData.id = randomUUID();
        } else {
            throw new ValidationError(`ID invalide pour ${entity}`);
        }
    }

    try {
        await db.syncHistory.create({
            data: {
                userId,
                deviceId: deviceId || 'unknown',
                syncType: 'PUSH',
                status: 'STARTED',
                itemsPushed: 1
            }
        });
    } catch (error) {
        logger.warn({ msg: 'syncHistory PUSH skipped', error });
    }

    let result: any;

    try {
        switch (entity) {
            case 'Task':
                if (type === 'DELETE') {
                    const deleteResult = await syncDeleteTask(normalizedData.id, userId);
                    if (!deleteResult.success) throw new ValidationError(deleteResult.error);
                    result = { id: normalizedData.id };
                } else {
                    const pushResult = await syncPushTask(normalizedData, userId, type);
                    if (!pushResult.success) throw new ValidationError(pushResult.error);
                    result = pushResult.data;
                }
                break;

            case 'Event':
                result = await EventSyncService.push(normalizedData, userId, type);
                break;

            case 'Grade':
                result = await GradeSyncService.push(normalizedData, userId, type);
                break;

            case 'Work':
                result = await WorkSyncService.push(normalizedData, userId, type);
                break;

            case 'Course':
                result = await CourseSyncService.push(normalizedData, userId, type);
                break;

            default:
                throw new ValidationError(`Entite non supportee: ${entity}`);
        }
    } catch (error: any) {
        if (isPrismaDataError(error)) {
            throw new ValidationError(error.message || 'Donnees de synchronisation invalides');
        }
        throw error;
    }

    res.status(200).json({
        success: true,
        data: {
            id: result?.id || normalizedData.id,
            syncedAt: new Date(),
            entity: result
        }
    });
});

/**
 * Handle PULL synchronization from client
 */
export const handleSyncPull = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    if (!userId) throw new UnauthorizedError();
    if (!isValidUuid(userId)) throw new UnauthorizedError('Token utilisateur invalide');

    const candidateDate = req.query.lastPulledAt ? new Date(String(req.query.lastPulledAt)) : new Date(0);
    const lastPulledAt = Number.isNaN(candidateDate.getTime()) ? new Date(0) : candidateDate;
    const deviceId = (req.query.deviceId as string) || 'unknown';

    const safePull = async <T>(label: string, fn: () => Promise<T[]>): Promise<T[]> => {
        try {
            return await fn();
        } catch (error) {
            logger.error({ msg: `sync pull failed for ${label}`, error, userId });
            return [];
        }
    };

    const [tasks, events, grades, works, courses] = await Promise.all([
        safePull('tasks', () => syncPullTasks(userId, lastPulledAt)),
        safePull('events', () => EventSyncService.pull(userId, lastPulledAt)),
        safePull('grades', () => GradeSyncService.pull(userId, lastPulledAt)),
        safePull('works', () => WorkSyncService.pull(userId, lastPulledAt)),
        safePull('courses', () => CourseSyncService.pull(userId, lastPulledAt))
    ]);

    const formattedTasks = tasks.map(ensureTaskCompatibility);

    try {
        await db.syncHistory.create({
            data: {
                userId,
                deviceId,
                syncType: 'PULL',
                status: 'COMPLETED',
                itemsPulled: formattedTasks.length + events.length + grades.length + works.length + courses.length
            }
        });
    } catch (error) {
        logger.warn({ msg: 'syncHistory PULL skipped', error });
    }

    res.status(200).json({
        success: true,
        data: {
            changes: {
                tasks: formattedTasks,
                events,
                grades,
                works,
                courses
            },
            timestamp: new Date()
        }
    });
});
