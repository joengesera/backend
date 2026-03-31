import * as TaskSyncService from "../TaskSyncService";
import { db } from "../../lib/db";

// Mock the database
jest.mock("../../lib/db", () => ({
  db: {
    task: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}));

describe("TaskSyncService", () => {
  const userId = "user-123";
  const taskId = "task-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("mapTaskToSync", () => {
    it("should correctly map a database task to sync response", () => {
      const dbTask = {
        id: taskId,
        title: "Test Task",
        description: "Desc",
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: new Date("2024-01-01"),
        courseId: "c1",
        eventId: "e1",
        durationMinutes: 30,
        timeSpentMinutes: 10,
        position: 1,
        startedAt: new Date("2024-01-01T10:00:00Z"),
        completedAt: null,
        createdAt: new Date("2024-01-01T09:00:00Z"),
        updatedAt: new Date("2024-01-01T11:00:00Z"),
        localId: "local-1",
        version: 1,
        syncStatus: "SYNCED",
      };

      const result = TaskSyncService.mapTaskToSync(dbTask);

      expect(result.id).toBe(taskId);
      expect(result.dueDate).toBe(dbTask.dueDate.toISOString());
      expect(result.startedAt).toBe(dbTask.startedAt.toISOString());
    });
  });

  describe("syncPushTask", () => {
    it("should push a new task successfully", async () => {
      const payload = {
        id: taskId,
        title: "New Task",
        version: 1,
      };

      (db.task.findUnique as jest.Mock).mockResolvedValue(null);
      (db.task.upsert as jest.Mock).mockResolvedValue({
        ...payload,
        userId,
        status: "PENDING",
        priority: "MEDIUM",
        timeSpentMinutes: 0,
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await TaskSyncService.syncPushTask(payload, userId, "CREATE");

      expect(result.success).toBe(true);
      expect(db.task.upsert).toHaveBeenCalled();
    });

    it("should return error if title is empty", async () => {
      const payload = { id: taskId, title: "" };
      const result = await TaskSyncService.syncPushTask(payload, userId, "CREATE");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Title is required");
    });

    it("should return error if task exists and belongs to another user on CREATE", async () => {
      const payload = { id: taskId, title: "Title" };
      (db.task.findUnique as jest.Mock).mockResolvedValue({ id: taskId, userId: "other-user" });
      
      const result = await TaskSyncService.syncPushTask(payload, userId, "CREATE");
      
      expect(result.success).toBe(false);
      expect(result.error).toBe("Task already exists");
    });
  });

  describe("syncDeleteTask", () => {
    it("should soft delete the task if owned by user", async () => {
      (db.task.findUnique as jest.Mock).mockResolvedValue({ id: taskId, userId });
      
      const result = await TaskSyncService.syncDeleteTask(taskId, userId);

      expect(result.success).toBe(true);
      expect(db.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: expect.objectContaining({ isDeleted: true }),
      });
    });

    it("should return error if task not found or not owned", async () => {
      (db.task.findUnique as jest.Mock).mockResolvedValue(null);
      const result = await TaskSyncService.syncDeleteTask(taskId, userId);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Task not found or forbidden");
    });
  });
});
