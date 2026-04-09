import { db } from "../lib/db";
import { Prisma } from "@prisma/client";

export class EventService {
  /**
   * Create an event with optional default tasks
   */
  static async createEvent(
    userId: string,
    data: any,
    generateDefaultTasks?: boolean
  ) {
    return db.$transaction(async (tx: any) => {
      const createdEvent = await tx.event.create({
        data,
      });

      if (generateDefaultTasks) {
        const templates = [
          { title: "Préparer le plan de révision", durationMinutes: 25 },
          { title: "Réviser les chapitres clés", durationMinutes: 45 },
          { title: "Faire un entraînement", durationMinutes: 60 },
          { title: "Relecture finale", durationMinutes: 25 },
        ];

        await tx.task.createMany({
          data: templates.map((item, index) => ({
            userId,
            eventId: createdEvent.id,
            courseId: (data.courseId || data.course?.connect?.id) || null, // Best effort
            title: item.title,
            durationMinutes: item.durationMinutes,
            position: index,
          })),
        });
      }

      return createdEvent;
    });
  }
}
