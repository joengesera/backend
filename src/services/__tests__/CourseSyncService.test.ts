import { CourseSyncService } from "../CourseSyncService";
import { db } from "../../lib/db";

// Mock the database
jest.mock("../../lib/db", () => ({
  db: {
    course: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    courseWorkType: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => {
      const tx = {
        course: {
          upsert: jest.fn().mockResolvedValue({ id: "course-123", workTypes: [] }),
        },
        courseWorkType: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
      };
      return await cb(tx);
    }),
  },
}));

describe("CourseSyncService", () => {
  const userId = "user-123";
  const courseId = "course-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("push", () => {
    it("should soft delete a course if type is DELETE", async () => {
      (db.course.findUnique as jest.Mock).mockResolvedValue({ id: courseId, userId });
      
      await CourseSyncService.push({ id: courseId }, userId, "DELETE");

      expect(db.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: expect.objectContaining({ isDeleted: true }),
      });
    });

    it("should throw error if the user is not the owner during DELETE", async () => {
      (db.course.findUnique as jest.Mock).mockResolvedValue({ id: courseId, userId: "other-user" });

      await expect(CourseSyncService.push({ id: courseId }, userId, "DELETE")).rejects.toThrow();
    });

    it("should create or update a course within a transaction", async () => {
      const payload = {
        id: courseId,
        code: "CS101",
        name: "Computer Science",
      };

      (db.course.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await CourseSyncService.push(payload, userId, "CREATE");

      expect(db.$transaction).toHaveBeenCalled();
      expect(result.id).toBe("course-123");
    });
  });

  describe("pull", () => {
    it("should fetch courses for the user modified since a date", async () => {
      const since = new Date("2024-01-01");
      (db.course.findMany as jest.Mock).mockResolvedValue([]);

      await CourseSyncService.pull(userId, since);

      expect(db.course.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          updatedAt: { gt: since },
        },
        include: { workTypes: true },
      });
    });
  });
});
