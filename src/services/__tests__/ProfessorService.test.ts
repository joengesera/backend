import { ProfessorService } from "../ProfessorService";
import { ProfessorAction } from "../../types/professor.types";
import { ForbiddenError, NotFoundError } from "../../errors/http.errors";

// Define mocks
const mockRepo = {
  findGradeById: jest.fn(),
  findGradeByWork: jest.fn(),
  findWork: jest.fn(),
  updateGrade: jest.fn(),
  createGrade: jest.fn(),
  findEvent: jest.fn(),
  updateEvent: jest.fn(),
  findProfessorWithCourses: jest.fn(),
  findCourse: jest.fn(),
  assignCourse: jest.fn(),
  listCoursesForProfessor: jest.fn(),
};

const mockAudit = {
  log: jest.fn(),
};

const mockCache = {
  invalidate: jest.fn(),
};

const mockUser = {
  getUser: jest.fn(),
};

describe("ProfessorService", () => {
  let service: ProfessorService;
  const professorId = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"; // Fake but should pass UUID regex
  const studentId = "8b2f19cf-9a0d-44ef-afbb-4b715fa12782"; 
  const courseId = "7c1e5d9a-4b2a-46e7-afdb-b6f0a83386c8"; 

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfessorService(
      mockRepo as any,
      mockAudit as any,
      mockCache as any,
      mockUser as any
    );
  });

  describe("updateGrade", () => {
    it("should create a new grade if user has permission and is assigned to course", async () => {
      const payload = {
        studentId,
        courseId,
        score: 15,
        maxScore: 20,
      };

      // Mock permissions
      mockUser.getUser.mockResolvedValue({ 
        id: professorId,
        permissions: [ProfessorAction.UPDATE_GRADE] 
      });
      mockRepo.findProfessorWithCourses.mockResolvedValue({ 
        id: "p1", 
        courses: [{ id: courseId }] 
      });

      // Mock creation
      mockRepo.findGradeById.mockResolvedValue(null);
      mockRepo.createGrade.mockResolvedValue({ 
        id: "00000000-0000-0000-0000-000000000001",
        score: 15,
        maxScore: 20,
        updatedAt: new Date(),
        name: "Note",
        percentage: null,
        comment: null,
        workId: null,
        work: null,
        workType: null,
        date: null
      });

      const result = await service.updateGrade(professorId, payload);

      expect(mockRepo.createGrade).toHaveBeenCalled();
      expect(result.score).toBe(15);
    });

    it("should throw ForbiddenError if professor is not assigned to course", async () => {
      const payload = { 
        studentId, 
        courseId, 
        score: 15 
      };
      
      mockUser.getUser.mockResolvedValue({ permissions: [ProfessorAction.UPDATE_GRADE] });
      mockRepo.findProfessorWithCourses.mockResolvedValue({ id: "p1", courses: [] });

      await expect(service.updateGrade(professorId, payload)).rejects.toThrow();
    });
  });

  describe("assignToCourse", () => {
    it("should assign professor to course if they have permission", async () => {
      mockUser.getUser.mockResolvedValue({ permissions: [ProfessorAction.ASSIGN_COURSE] });
      mockRepo.findProfessorWithCourses.mockResolvedValue({ id: "p1", userId: professorId });
      mockRepo.findCourse.mockResolvedValue({ id: courseId });
      mockRepo.assignCourse.mockResolvedValue(null);
      mockRepo.listCoursesForProfessor.mockResolvedValue([{ id: courseId }]);

      const result = await service.assignToCourse(professorId, courseId);

      expect(mockRepo.assignCourse).toHaveBeenCalledWith("p1", courseId);
      expect(result.courses).toHaveLength(1);
    });
  });
});
