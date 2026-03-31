import { TaskService } from "../TaskService";
import { db } from "../../lib/db";

// Mock the database
jest.mock("../../lib/db", () => ({
  db: {
    task: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    taskSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}));

describe("TaskService", () => {
  const userId = "user-123";
  const taskId = "task-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("startTask", () => {
    it("should start a task if ownership is verified and no other task is running", async () => {
      const mockTask = { id: taskId, userId, isDeleted: false };
      (db.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (db.task.findFirst as jest.Mock).mockResolvedValue(null); // No active task
      (db.task.update as jest.Mock).mockResolvedValue({ ...mockTask, status: "IN_PROGRESS" });

      const result = await TaskService.startTask(taskId, userId);

      expect(db.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: expect.objectContaining({ status: "IN_PROGRESS" }),
      });
      expect(db.taskSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ taskId }),
      });
      expect(result.status).toBe("IN_PROGRESS");
    });

    it("should throw error if task not found or not owned", async () => {
      (db.task.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(TaskService.startTask("wrong-id", userId)).rejects.toThrow("Task not found");
    });

    it("should throw error if another task is already running", async () => {
      (db.task.findUnique as jest.Mock).mockResolvedValue({ id: taskId, userId, isDeleted: false });
      (db.task.findFirst as jest.Mock).mockResolvedValue({ id: "other-task-id" });

      await expect(TaskService.startTask(taskId, userId)).rejects.toThrow("Another task is already running");
    });
  });

  describe("pauseTask", () => {
    it("should pause a running task and update timeSpent", async () => {
      const startTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const mockTask = { id: taskId, userId, startedAt: startTime, timeSpentMinutes: 5 };
      (db.task.findUnique as jest.Mock).mockResolvedValue(mockTask);
      (db.task.update as jest.Mock).mockResolvedValue({ ...mockTask, timeSpentMinutes: 15, startedAt: null });
      (db.taskSession.findFirst as jest.Mock).mockResolvedValue({ id: "session-1" });

      const result = await TaskService.pauseTask(taskId, userId);

      expect(result.addedMinutes).toBe(10);
      expect(result.timeSpentMinutes).toBe(15);
      expect(db.taskSession.update).toHaveBeenCalled();
    });

    it("should throw error if task is not running", async () => {
      (db.task.findUnique as jest.Mock).mockResolvedValue({ id: taskId, userId, startedAt: null });
      await expect(TaskService.pauseTask(taskId, userId)).rejects.toThrow("Task is not running");
    });
  });

  describe("reorderTasks", () => {
    it("should reorder tasks in a transaction after verifying ownership", async () => {
      const items = [
        { taskId: "t1", eventId: null, position: 1 },
        { taskId: "t2", eventId: "e1", position: 2 },
      ];
      (db.task.count as jest.Mock).mockResolvedValue(2);

      await TaskService.reorderTasks(userId, items);

      expect(db.task.count).toHaveBeenCalled();
      expect(db.$transaction).toHaveBeenCalled();
      expect(db.task.update).toHaveBeenCalledTimes(2);
    });

    it("should throw error if one or more tasks do not belong to user", async () => {
      const items = [{ taskId: "t1", eventId: null, position: 1 }];
      (db.task.count as jest.Mock).mockResolvedValue(0);

      await expect(TaskService.reorderTasks(userId, items)).rejects.toThrow("One or more tasks do not belong to user");
    });
  });
});
