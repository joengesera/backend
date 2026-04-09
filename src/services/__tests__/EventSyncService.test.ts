import { EventSyncService } from "../EventSyncService";
import { db } from "../../lib/db";
import { ForbiddenError } from "../../errors/http.errors";

// Mock the database
jest.mock("../../lib/db", () => ({
  db: {
    event: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
  },
}));

describe("EventSyncService", () => {
  const userId = "user-123";
  const eventId = "event-456";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("push", () => {
    describe("DELETE", () => {
      it("should delete an event if the user is the owner", async () => {
        (db.event.findUnique as jest.Mock).mockResolvedValue({ id: eventId, userId });
        
        await EventSyncService.push({ id: eventId }, userId, "DELETE");

        expect(db.event.delete).toHaveBeenCalledWith({ where: { id: eventId } });
      });

      it("should throw ForbiddenError if the user is not the owner", async () => {
        (db.event.findUnique as jest.Mock).mockResolvedValue({ id: eventId, userId: "other-user" });

        await expect(EventSyncService.push({ id: eventId }, userId, "DELETE")).rejects.toThrow();
      });

      it("should return early if the event does not exist", async () => {
        (db.event.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await EventSyncService.push({ id: eventId }, userId, "DELETE");

        expect(result).toEqual({ id: eventId });
        expect(db.event.delete).not.toHaveBeenCalled();
      });
    });

    describe("CREATE / UPDATE", () => {
      it("should upsert an event and normalize the type", async () => {
        const payload = {
          id: eventId,
          title: "Test Lecture",
          type: "LECTURE", // Should be normalized to CLASS
          startDate: "2024-01-01T10:00:00Z",
          version: 1,
        };

        (db.event.upsert as jest.Mock).mockResolvedValue({ ...payload, type: "CLASS" });

        const result = await EventSyncService.push(payload, userId, "CREATE");

        expect(db.event.upsert).toHaveBeenCalledWith(expect.objectContaining({
          create: expect.objectContaining({
            type: "CLASS",
            userId,
          }),
        }));
        expect(result.type).toBe("CLASS");
      });

      it("should nullify courseId if the course does not belong to the user", async () => {
        const payload = {
          id: eventId,
          courseId: "course-789",
        };

        (db.course.findUnique as jest.Mock).mockResolvedValue({ id: "course-789", userId: "other-user" });
        (db.event.upsert as jest.Mock).mockResolvedValue({});

        await EventSyncService.push(payload, userId, "CREATE");

        expect(db.event.upsert).toHaveBeenCalledWith(expect.objectContaining({
          create: expect.objectContaining({
            courseId: null,
          }),
        }));
      });
    });
  });

  describe("pull", () => {
    it("should fetch events for the user modified since a date", async () => {
      const since = new Date("2024-01-01");
      (db.event.findMany as jest.Mock).mockResolvedValue([]);

      await EventSyncService.pull(userId, since);

      expect(db.event.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          lastModifiedAt: { gt: since },
        },
      });
    });
  });
});
