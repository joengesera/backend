"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskService = void 0;
// src/services/RiskService.ts
const db_1 = require("../lib/db");
class RiskService {
    static async analyzeCourse(courseId, userId) {
        // 1. COLLECTE DES DONNÉES
        // On utilise "as any" pour forcer TypeScript à ignorer les erreurs de relations
        const course = await db_1.db.course.findUnique({
            where: { id: courseId },
            include: {
                grades: { include: { workType: true } },
                workTypes: true,
                tasks: { where: { userId: userId } }, // Retrait temporaire du filtre isDeleted
                events: {
                    where: { type: 'EXAM' },
                    orderBy: { startDate: 'asc' },
                    take: 1
                }
            }
        });
        if (!course || course.userId !== userId) {
            throw new Error("Cours introuvable ou accès non autorisé");
        }
        // 2. CALCUL DES INDICATEURS
        // On vérifie que les tableaux existent pour éviter les crashs
        const grades = course.grades || [];
        const workTypes = course.workTypes || [];
        const tasks = course.tasks || [];
        const nextExam = (course.events && course.events.length > 0) ? course.events[0] : null;
        const gradeFactor = this.calculateGradeScore(grades, workTypes);
        const workloadFactor = this.calculateWorkloadScore(tasks);
        const urgencyFactor = this.calculateUrgencyScore(nextExam);
        const finalScore = (gradeFactor * 0.4) + (workloadFactor * 0.3) + (urgencyFactor * 0.3);
        return {
            courseId: course.id,
            courseName: course.name,
            overallScore: Math.round(finalScore),
            level: this.getRiskLevel(finalScore),
            details: {
                performance: Math.round(gradeFactor),
                procrastination: Math.round(workloadFactor),
                pressure: Math.round(urgencyFactor)
            }
        };
    }
    static calculateGradeScore(grades, workTypes) {
        if (grades.length === 0)
            return 40;
        if (workTypes.length === 0) {
            const average = grades.reduce((acc, g) => acc + (g.score / g.maxScore), 0) / grades.length;
            return Math.max(0, (1 - average) * 100);
        }
        const gradesByType = new Map();
        grades.forEach((grade) => {
            const type = grade.workType?.type;
            if (!type)
                return;
            if (!gradesByType.has(type))
                gradesByType.set(type, []);
            gradesByType.get(type).push(grade);
        });
        let totalWeighted = 0;
        let totalWeight = 0;
        workTypes.forEach((typeConfig) => {
            const typeGrades = gradesByType.get(typeConfig.type) || [];
            if (typeGrades.length === 0)
                return;
            const avg = typeGrades.reduce((acc, g) => acc + (g.score / g.maxScore), 0) / typeGrades.length;
            totalWeighted += avg * typeConfig.weightPercent;
            totalWeight += typeConfig.weightPercent;
        });
        const average = totalWeight > 0 ? totalWeighted / totalWeight : 0;
        return Math.max(0, (1 - average) * 100);
    }
    static calculateWorkloadScore(tasks) {
        const pending = tasks.filter(t => t.status !== 'COMPLETED').length;
        return Math.min(100, pending * 20);
    }
    static calculateUrgencyScore(nextExam) {
        if (!nextExam)
            return 20;
        const now = new Date();
        const examDate = new Date(nextExam.startDate);
        const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 2)
            return 100;
        if (diffDays <= 7)
            return 70;
        if (diffDays <= 14)
            return 40;
        return 10;
    }
    static getRiskLevel(score) {
        if (score < 30)
            return 'LOW';
        if (score < 60)
            return 'MEDIUM';
        if (score < 85)
            return 'HIGH';
        return 'CRITICAL';
    }
}
exports.RiskService = RiskService;
