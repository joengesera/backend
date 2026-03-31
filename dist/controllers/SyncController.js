"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSyncPull = exports.handleSyncPush = void 0;
const crypto_1 = require("crypto");
const db_1 = require("../lib/db");
const catchAsync_1 = require("../utils/catchAsync");
const http_errors_1 = require("../errors/http.errors");
const logger_1 = require("../utils/logger");
const TaskSyncService_1 = require("../services/TaskSyncService");
const EventSyncService_1 = require("../services/EventSyncService");
const GradeSyncService_1 = require("../services/GradeSyncService");
const WorkSyncService_1 = require("../services/WorkSyncService");
const CourseSyncService_1 = require("../services/CourseSyncService");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value);
const isPrismaDataError = (error) => typeof error?.code === 'string' && /^P2\d{3}$/.test(error.code);
/**
 * Handle PUSH synchronization from client
 */
exports.handleSyncPush = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const { type, entity, data, deviceId } = req.body;
    const userId = req.user?.userId;
    if (!userId)
        throw new http_errors_1.UnauthorizedError();
    if (!isValidUuid(userId))
        throw new http_errors_1.UnauthorizedError('Token utilisateur invalide');
    if (!entity || !data?.id)
        throw new http_errors_1.ValidationError('Entite ou ID manquant');
    if (!['CREATE', 'UPDATE', 'DELETE'].includes(type)) {
        throw new http_errors_1.ValidationError('Type de synchronisation invalide');
    }
    const normalizedData = { ...data };
    if (!isValidUuid(normalizedData.id)) {
        if (type === 'CREATE') {
            normalizedData.id = (0, crypto_1.randomUUID)();
        }
        else {
            throw new http_errors_1.ValidationError(`ID invalide pour ${entity}`);
        }
    }
    try {
        await db_1.db.syncHistory.create({
            data: {
                userId,
                deviceId: deviceId || 'unknown',
                syncType: 'PUSH',
                status: 'STARTED',
                itemsPushed: 1
            }
        });
    }
    catch (error) {
        logger_1.logger.warn({ msg: 'syncHistory PUSH skipped', error });
    }
    let result;
    try {
        switch (entity) {
            case 'Task':
                if (type === 'DELETE') {
                    const deleteResult = await (0, TaskSyncService_1.syncDeleteTask)(normalizedData.id, userId);
                    if (!deleteResult.success)
                        throw new http_errors_1.ValidationError(deleteResult.error);
                    result = { id: normalizedData.id };
                }
                else {
                    const pushResult = await (0, TaskSyncService_1.syncPushTask)(normalizedData, userId, type);
                    if (!pushResult.success)
                        throw new http_errors_1.ValidationError(pushResult.error);
                    result = pushResult.data;
                }
                break;
            case 'Event':
                result = await EventSyncService_1.EventSyncService.push(normalizedData, userId, type);
                break;
            case 'Grade':
                result = await GradeSyncService_1.GradeSyncService.push(normalizedData, userId, type);
                break;
            case 'Work':
                result = await WorkSyncService_1.WorkSyncService.push(normalizedData, userId, type);
                break;
            case 'Course':
                result = await CourseSyncService_1.CourseSyncService.push(normalizedData, userId, type);
                break;
            default:
                throw new http_errors_1.ValidationError(`Entite non supportee: ${entity}`);
        }
    }
    catch (error) {
        if (isPrismaDataError(error)) {
            throw new http_errors_1.ValidationError(error.message || 'Donnees de synchronisation invalides');
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
exports.handleSyncPull = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.user?.userId;
    if (!userId)
        throw new http_errors_1.UnauthorizedError();
    if (!isValidUuid(userId))
        throw new http_errors_1.UnauthorizedError('Token utilisateur invalide');
    const candidateDate = req.query.lastPulledAt ? new Date(String(req.query.lastPulledAt)) : new Date(0);
    const lastPulledAt = Number.isNaN(candidateDate.getTime()) ? new Date(0) : candidateDate;
    const deviceId = req.query.deviceId || 'unknown';
    const safePull = async (label, fn) => {
        try {
            return await fn();
        }
        catch (error) {
            logger_1.logger.error({ msg: `sync pull failed for ${label}`, error, userId });
            return [];
        }
    };
    const [tasks, events, grades, works, courses] = await Promise.all([
        safePull('tasks', () => (0, TaskSyncService_1.syncPullTasks)(userId, lastPulledAt)),
        safePull('events', () => EventSyncService_1.EventSyncService.pull(userId, lastPulledAt)),
        safePull('grades', () => GradeSyncService_1.GradeSyncService.pull(userId, lastPulledAt)),
        safePull('works', () => WorkSyncService_1.WorkSyncService.pull(userId, lastPulledAt)),
        safePull('courses', () => CourseSyncService_1.CourseSyncService.pull(userId, lastPulledAt))
    ]);
    const formattedTasks = tasks.map(TaskSyncService_1.ensureTaskCompatibility);
    try {
        await db_1.db.syncHistory.create({
            data: {
                userId,
                deviceId,
                syncType: 'PULL',
                status: 'COMPLETED',
                itemsPulled: formattedTasks.length + events.length + grades.length + works.length + courses.length
            }
        });
    }
    catch (error) {
        logger_1.logger.warn({ msg: 'syncHistory PULL skipped', error });
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
