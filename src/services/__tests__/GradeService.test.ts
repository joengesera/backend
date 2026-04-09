import { GradeService } from "../GradeService";
import { db } from "../../lib/db";
import { PointsEngineService } from "../PointsEngineService";

// Mock the database
jest.mock("../../lib/db", () => ({
  db: {
    grade: {
      findMany: jest.fn(),
    },
  },
}));

// Mock PointsEngineService
jest.mock("../PointsEngineService", () => ({
  PointsEngineService: {
    calculatePercentageBasedAverage: jest.fn(),
    normalizeToTwenty: jest.fn(),
    getTypeLabel: jest.fn(),
  },
}));

describe("GradeService", () => {
  const userId = "user-123";
  const courseId = "course-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCourseAverage", () => {
    it("should calculate and return course average", async () => {
      const mockGrades = [
        { name: "Test 1", score: 15, maxScore: 20, course: { id: courseId, name: "Math", code: "M1" } },
      ];
      (db.grade.findMany as jest.Mock).mockResolvedValue(mockGrades);
      (PointsEngineService.calculatePercentageBasedAverage as jest.Mock).mockReturnValue(15);
      (PointsEngineService.normalizeToTwenty as jest.Mock).mockReturnValue(15);
      (PointsEngineService.getTypeLabel as jest.Mock).mockReturnValue("EXAM");

      const result = await GradeService.getCourseAverage(userId, courseId);

      expect(result?.average).toBe(15);
      expect(result?.grades).toHaveLength(1);
      expect(db.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId, courseId } }));
    });

    it("should return null if no grades found", async () => {
      (db.grade.findMany as jest.Mock).mockResolvedValue([]);
      const result = await GradeService.getCourseAverage(userId, courseId);
      expect(result).toBeNull();
    });
  });

  describe("getGeneralAverage", () => {
    it("should group grades by course and calculate general average", async () => {
      const mockGrades = [
        { courseId: "c1", score: 10, maxScore: 20, course: { name: "C1", code: "CC1" } },
        { courseId: "c2", score: 20, maxScore: 20, course: { name: "C2", code: "CC2" } },
      ];
      (db.grade.findMany as jest.Mock).mockResolvedValue(mockGrades);
      (PointsEngineService.calculatePercentageBasedAverage as jest.Mock)
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(20);

      const result = await GradeService.getGeneralAverage(userId);

      expect(result.generalAverage).toBe(15);
      expect(result.courseAverages).toHaveLength(2);
    });
  });

  describe("getGradeStatistics", () => {
    it("should calculate correct statistics", async () => {
      const mockGrades = [
        { score: 10, maxScore: 20 },
        { score: 20, maxScore: 20 },
      ];
      (db.grade.findMany as jest.Mock).mockResolvedValue(mockGrades);

      const result = await GradeService.getGradeStatistics(userId);

      expect(result.stats?.mean).toBe(15);
      expect(result.stats?.min).toBe(10);
      expect(result.stats?.max).toBe(20);
    });
  });
});
