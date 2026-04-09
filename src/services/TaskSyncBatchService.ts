/**
 * TaskSyncBatchService
 * Service pour gérer les opérations de sync en batch
 * Optimise les performances pour les sync push/pull multiples
 */

import { db } from '../lib/db';
import {
    syncPushTask,
    syncDeleteTask,
    mapTaskToSync,
    ensureTaskCompatibility,
    TaskSyncPayload
} from './TaskSyncService';

export interface BatchSyncResult {
    successful: string[];
    failed: Array<{ taskId: string; error: string }>;
    summary: {
        total: number;
        successCount: number;
        failCount: number;
    };
}

/**
 * 3.2: Batch PUSH - Multiple tasks sync
 * Envoie plusieurs tasks en une seule transaction
 */
export async function batchPushTasks(
    payloads: Array<{ payload: TaskSyncPayload; type: 'CREATE' | 'UPDATE' | 'DELETE' }>,
    userId: string
): Promise<BatchSyncResult> {
    const result: BatchSyncResult = {
        successful: [],
        failed: [],
        summary: { total: payloads.length, successCount: 0, failCount: 0 }
    };

    for (const { payload, type } of payloads) {
        try {
            if (type === 'DELETE') {
                const deleteResult = await syncDeleteTask(payload.id, userId);
                if (deleteResult.success) {
                    result.successful.push(payload.id);
                    result.summary.successCount++;
                } else {
                    result.failed.push({ taskId: payload.id, error: deleteResult.error || 'Unknown error' });
                    result.summary.failCount++;
                }
            } else {
                const pushResult = await syncPushTask(payload, userId, type);
                if (pushResult.success) {
                    result.successful.push(payload.id);
                    result.summary.successCount++;
                } else {
                    result.failed.push({ taskId: payload.id, error: pushResult.error || 'Unknown error' });
                    result.summary.failCount++;
                }
            }
        } catch (error: any) {
            result.failed.push({ taskId: payload.id, error: error.message });
            result.summary.failCount++;
        }
    }

    return result;
}

/**
 * 3.2: Batch PULL + MERGE
 * Récupère les changes et les merge avec une stratégie smart
 * 
 * Stratégie de merge (Last Write Wins):
 * - Si une task locale est en PENDING et plus récente que le serveur → garder la locale
 * - Sinon → utiliser la version serveur
 */
export async function batchPullAndMerge(
    userId: string,
    lastPulledAt: Date,
    localTaskSnapshots?: Record<string, TaskSyncPayload>
): Promise<{
    tasks: any[];
    mergedTasks: any[];
    conflicts: Array<{ taskId: string; reason: string }>;
}> {
    const tasks = await db.task.findMany({
        where: {
            userId,
            lastModifiedAt: { gt: lastPulledAt },
            isDeleted: false
        },
        orderBy: { lastModifiedAt: 'desc' }
    });

    const formattedTasks = tasks.map((task: any) => {
        const mapped = mapTaskToSync(task);
        return ensureTaskCompatibility(mapped);
    });

    const conflictTasks: Array<{ taskId: string; reason: string }> = [];
    const mergedTasks = formattedTasks.map((remoteTask: any) => {
        // Si pas de snapshot local, retourner la version serveur
        if (!localTaskSnapshots || !localTaskSnapshots[remoteTask.id]) {
            return remoteTask;
        }

        const localTask = localTaskSnapshots[remoteTask.id];

        // Strategy: Last Write Wins
        // Si local est PENDING et version locale > version serveur, garder local
        if (
            localTask.syncStatus === 'PENDING' &&
            (localTask.version ?? 0) > (remoteTask.version ?? 0)
        ) {
            conflictTasks.push({
                taskId: remoteTask.id,
                reason: 'Local version is newer and pending - keeping local'
            });
            return { ...remoteTask, ...localTask, version: localTask.version };
        }

        // Sinon retourner la version serveur (dernière mise à jour gagne)
        return remoteTask;
    });

    return {
        tasks: formattedTasks,
        mergedTasks,
        conflicts: conflictTasks
    };
}

/**
 * 3.2: Smart sync - Combine PUSH et PULL
 * 1. Push les changes locaux
 * 2. Pull les changes serveur
 * 3. Merge intelligemment
 */
export async function smartSync(
    userId: string,
    lastPulledAt: Date,
    localChanges: Array<{
        payload: TaskSyncPayload;
        type: 'CREATE' | 'UPDATE' | 'DELETE';
    }>,
    localSnapshots?: Record<string, TaskSyncPayload>
): Promise<{
    pushResult: BatchSyncResult;
    pullResult: {
        tasks: any[];
        mergedTasks: any[];
        conflicts: Array<{ taskId: string; reason: string }>;
    };
}> {
    // Step 1: Push
    const pushResult = await batchPushTasks(localChanges, userId);

    // Step 2 & 3: Pull and Merge
    const pullResult = await batchPullAndMerge(userId, lastPulledAt, localSnapshots);

    return { pushResult, pullResult };
}

/**
 * 3.2: Compatibility check - Ensure old tasks are upgraded
 * Ajoute les champs manquants aux anciennes tasks
 */
export async function upgradeTasksCompatibility(userId: string): Promise<number> {
    // Find old tasks missing new fields (backward compatibility)
    const oldTasks = await db.task.findMany({
        where: {
            userId,
            OR: [
                { durationMinutes: null },
                { startedAt: null }, // Old tasks won't have startedAt field
            ]
        }
    });

    if (oldTasks.length === 0) return 0;

    // Batch update avec valeurs par défaut
    const updates = oldTasks.map((task: any) =>
        db.task.update({
            where: { id: task.id },
            data: {
                durationMinutes: task.durationMinutes,
                timeSpentMinutes: task.timeSpentMinutes ?? 0,
                position: task.position ?? 0,
                lastModifiedAt: new Date()
            }
        })
    );

    await db.$transaction(updates);
    return oldTasks.length;
}
