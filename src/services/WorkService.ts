import { db } from '../lib/db';
import { PointsEngineService } from './PointsEngineService';

export class WorkService {
  static validatePointsRange(pointsEarned: number | null | undefined, pointsPossible: number) {
    if (!Number.isFinite(pointsPossible) || pointsPossible <= 0) {
      return 'Le maximum de points doit etre superieur a 0';
    }
    if (pointsEarned === null || pointsEarned === undefined) return null;
    if (!Number.isFinite(pointsEarned) || pointsEarned < 0 || pointsEarned > pointsPossible) {
      return 'Les points obtenus doivent etre compris entre 0 et le maximum';
    }
    return null;
  }

  static async resolveWorkTypeId(courseId: string, workType?: string | null) {
    if (!workType) return undefined;
    const configured = await db.courseWorkType.findMany({
      where: { courseId },
      select: { id: true, type: true }
    });
    if (configured.length === 0) return undefined;
    const normalized = String(workType).trim().toUpperCase();
    const match = configured.find((item: any) => item.type.toUpperCase() === normalized);
    return match ? match.id : undefined;
  }

  static async recalculateForCourse(userId: string, courseId: string) {
    const works = await db.work.findMany({
      where: { userId, courseId },
      include: { workType: { select: { type: true, weightPercent: true } } }
    });

    const gradedWorks = works.filter((work: any) =>
      work.pointsEarned !== null && Number.isFinite(work.pointsEarned) && Number.isFinite(work.pointsPossible)
    );

    if (gradedWorks.length === 0) {
      return {
        courseId,
        workCount: works.length,
        gradedWorkCount: 0,
        average: null
      };
    }

    const average = PointsEngineService.calculatePercentageBasedAverage(
      gradedWorks.map((work: any) => ({
        score: Number(work.pointsEarned),
        maxScore: Number(work.pointsPossible),
        percentage: work.percentage,
        workTypeLabel: work.workTypeLabel,
        workType: work.workType
      }))
    );

    return {
      courseId,
      workCount: works.length,
      gradedWorkCount: gradedWorks.length,
      average: Math.round(average * 100) / 100
    };
  }
}
