import { GradeSyncService } from "../GradeSyncService";
import { db } from "../../lib/db";

jest.mock("../../lib/db", () => ({
  db: {
    grade: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    work: {
      findUnique: jest.fn(),
    },
  },
}));

describe("GradeSyncService", () => {
  const userId = "user-123";
  const gradeId = "grade-456";
  const courseId = "course-789";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("push", () => {
    it("should delete a grade if type is DELETE", async () => {
      (db.grade.findUnique as jest.Mock).mockResolvedValue({ id: gradeId, userId });
      
      await GradeSyncService.push({ id: gradeId, courseId, score: 0 } as any, userId, "DELETE");

      expect(db.grade.delete).toHaveBeenCalledWith({ where: { id: gradeId } });
    });

    it("should validate and upsert a grade", async () => {
      const payload = {
        id: gradeId,
        courseId,
        score: 15,
        maxScore: 20,
      };

      (db.course.findUnique as jest.Mock).mockResolvedValue({ id: courseId, userId });
      (db.grade.upsert as jest.Mock).mockResolvedValue({ ...payload, userId });

      const result = await GradeSyncService.push(payload as any, userId, "CREATE") as any;

      expect(db.grade.upsert).toHaveBeenCalled();
      expect(result.score).toBe(15);
    });
  });

  describe("pull", () => {
    it("should fetch grades for the user", async () => {
      const since = new Date("2024-01-01");
      (db.grade.findMany as jest.Mock).mockResolvedValue([]);

      await GradeSyncService.pull(userId, since);

      expect(db.grade.findMany).toHaveBeenCalled();
    });
  });
});
