import { db } from "../lib/db";
import { Prisma } from "@prisma/client";

export class TaskService {
  /**
   * Calculate time spent in minutes from milliseconds
   */
  private static roundMinutesFromMs(ms: number) {
    return Math.max(0, Math.round(ms / 60000));
  }

  private static roundSecondsFromMs(ms: number) {
    return Math.max(0, Math.round(ms / 1000));
  }

  /**
   * Start a task (Focus mode)
   */
  static async startTask(taskId: string, userId: string) {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId || task.isDeleted) {
      throw new Error("Task not found");
    }

    // Check if another task is running
    const active = await db.task.findFirst({
      where: { userId, startedAt: { not: null }, isDeleted: false },
    });
    if (active && active.id !== taskId) {
      throw new Error("Another task is already running");
    }

    const now = new Date();
    const updated = await db.task.update({
      where: { id: taskId },
      data: { startedAt: now, status: "IN_PROGRESS", updatedAt: now },
    });

    await db.taskSession.create({
      data: { taskId: taskId, startedAt: now },
    });

    return updated;
  }

  /**
   * Pause a task
   */
  static async pauseTask(taskId: string, userId: string) {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId || task.isDeleted) {
      throw new Error("Task not found");
    }
    if (!task.startedAt) {
      throw new Error("Task is not running");
    }

    const now = new Date();
    const diffMs = now.getTime() - new Date(task.startedAt).getTime();
    const addedMinutes = this.roundMinutesFromMs(diffMs);

    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        startedAt: null,
        timeSpentMinutes: (task.timeSpentMinutes || 0) + addedMinutes,
        updatedAt: now,
      },
    });

    const openSession = await db.taskSession.findFirst({
      where: { taskId: taskId, endDate: null },
      orderBy: { startedAt: "desc" },
    });

    if (openSession) {
      await db.taskSession.update({
        where: { id: openSession.id },
        data: { endDate: now, durationSeconds: this.roundSecondsFromMs(diffMs) },
      });
    }

    return {
      taskId,
      addedMinutes,
      timeSpentMinutes: updated.timeSpentMinutes,
    };
  }

  /**
   * Complete a task
   */
  static async completeTask(taskId: string, userId: string) {
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId || task.isDeleted) {
      throw new Error("Task not found");
    }

    const now = new Date();
    let addedMinutes = 0;

    if (task.startedAt) {
      const diffMs = now.getTime() - new Date(task.startedAt).getTime();
      addedMinutes = this.roundMinutesFromMs(diffMs);

      const openSession = await db.taskSession.findFirst({
        where: { taskId: taskId, endDate: null },
        orderBy: { startedAt: "desc" },
      });
      if (openSession) {
        await db.taskSession.update({
          where: { id: openSession.id },
          data: { endDate: now, durationSeconds: this.roundSecondsFromMs(diffMs) },
        });
      }
    }

    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        startedAt: null,
        timeSpentMinutes: (task.timeSpentMinutes || 0) + addedMinutes,
        updatedAt: now,
      },
    });

    return updated;
  }

  /**
   * Reorder tasks in batch
   */
  static async reorderTasks(
    userId: string,
    items: { taskId: string; eventId: string | null; position: number }[]
  ) {
    if (!items.length) return;

    // Verify ownership
    const taskIds = items.map((i) => i.taskId);
    const count = await db.task.count({
      where: { id: { in: taskIds }, userId },
    });
    if (count !== taskIds.length) {
      throw new Error("One or more tasks do not belong to user");
    }

    // Transactional update
    await db.$transaction(
      items.map((item) =>
        db.task.update({
          where: { id: item.taskId },
          data: {
            eventId: item.eventId || null,
            position: item.position,
            updatedAt: new Date(),
          },
        })
      )
    );
  }

  /**
   * Create a task
   */
  static async createTask(userId: string, data: any) {
    // Logic to calculate position if not provided could go here
    return db.task.create({ data });
  }
}
