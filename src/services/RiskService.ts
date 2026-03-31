// src/services/RiskService.ts
// CORRECTIFS:
// - Filtre isDeleted réactivé sur les tasks
// - Plus de "as any" pour bypasser Prisma — types explicites
// - Calcul urgencyScore assaini (diffDays négatif si examen passé → score max)

import { db } from '../lib/db';
import { PointsEngineService } from './PointsEngineService';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface RiskAnalysis {
  courseId: string;
  courseName: string;
  overallScore: number;
  level: RiskLevel;
  details: {
    performance: number;
    procrastination: number;
    pressure: number;
  };
}

export class RiskService {
  static async analyzeCourse(courseId: string, userId: string): Promise<RiskAnalysis> {
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        grades: { include: { workType: true } },
        works: {
          include: { workType: true },
          where: { status: { in: ['PLANNED', 'SUBMITTED'] } },
          orderBy: { dueDate: 'asc' },
        },
        workTypes: true,
        tasks: {
          where: {
            userId,
            isDeleted: false, // CORRECTIF: filtre réactivé — les tâches supprimées ne comptent pas
          },
        },
        events: {
          where: { type: { in: ['EXAM', 'EXAMEN'] } },
          orderBy: { startDate: 'asc' },
          take: 1,
        },
      },
    });

    if (!course || course.userId !== userId) {
      throw new Error('Cours introuvable ou accès non autorisé');
    }

    const grades = course.grades;
    const tasks = course.tasks;
    const nextExamEvent = course.events[0] ?? null;

    // Prochain examen via les works planifiés/soumis
    const nextExamWork =
      course.works.find(
        (w) =>
          String(w.workTypeLabel ?? w.workType?.type ?? '').toUpperCase() === 'EXAMEN' && !!w.dueDate
      ) ?? null;

    const gradeFactor = this.calculateGradeScore(course.grades);
    const workloadFactor = this.calculateWorkloadScore(tasks);
    const urgencyFactor = this.calculateUrgencyScore(
      nextExamWork?.dueDate ?? nextExamEvent?.startDate ?? null
    );

    const finalScore = gradeFactor * 0.4 + workloadFactor * 0.3 + urgencyFactor * 0.3;

    return {
      courseId: course.id,
      courseName: course.name,
      overallScore: Math.round(finalScore),
      level: this.getRiskLevel(finalScore),
      details: {
        performance: Math.round(gradeFactor),
        procrastination: Math.round(workloadFactor),
        pressure: Math.round(urgencyFactor),
      },
    };
  }

  private static calculateGradeScore(grades: { score: number; maxScore: number; percentage?: number | null; weight?: number | null; workType?: { type: string; weightPercent: number } | null }[]): number {
    if (grades.length === 0) return 40; // Score neutre si pas de notes
    const averageOn20 = PointsEngineService.calculatePercentageBasedAverage(grades);
    return Math.max(0, (1 - averageOn20 / 20) * 100);
  }

  private static calculateWorkloadScore(tasks: { status: string }[]): number {
    const pending = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELED').length;
    // CORRECTIF: on exclut aussi les tâches CANCELED du workload
    return Math.min(100, pending * 20);
  }

  private static calculateUrgencyScore(nextExamDate: Date | string | null): number {
    if (!nextExamDate) return 20;

    const now = new Date();
    const examDate = new Date(nextExamDate);
    const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // CORRECTIF: examen passé (diffDays <= 0) → score max d'urgence
    if (diffDays <= 0) return 100;
    if (diffDays <= 2) return 100;
    if (diffDays <= 7) return 70;
    if (diffDays <= 14) return 40;
    return 10;
  }

  private static getRiskLevel(score: number): RiskLevel {
    if (score < 30) return 'LOW';
    if (score < 60) return 'MEDIUM';
    if (score < 85) return 'HIGH';
    return 'CRITICAL';
  }
}