"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradeService = void 0;
const db_1 = require("../lib/db");
class GradeService {
    /**
     * Calculate weighted average for a specific course
     */
    static async getCourseAverage(userId, courseId) {
        const grades = await db_1.db.grade.findMany({
            where: { userId, courseId },
            include: { course: true }
        });
        if (grades.length === 0) {
            return null;
        }
        let totalWeightedScore = 0;
        let totalWeight = 0;
        grades.forEach(grade => {
            const percentage = (grade.score / grade.maxScore) * 20;
            const weight = grade.weight || 1.0;
            totalWeightedScore += percentage * weight;
            totalWeight += weight;
        });
        const average = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        return {
            courseId,
            courseName: grades[0].course?.name || 'Unknown',
            courseCode: grades[0].course?.code || 'N/A',
            average: Math.round(average * 100) / 100,
            gradeCount: grades.length,
            grades: grades.map(g => ({
                name: g.name,
                score: g.score,
                maxScore: g.maxScore,
                weight: g.weight,
                normalized: Math.round((g.score / g.maxScore) * 20 * 100) / 100
            }))
        };
    }
    /**
     * Calculate general average across all courses
     */
    static async getGeneralAverage(userId) {
        const grades = await db_1.db.grade.findMany({
            where: { userId },
            include: { course: true }
        });
        if (grades.length === 0) {
            return {
                generalAverage: null,
                courseAverages: [],
                totalCourses: 0,
                totalGrades: 0,
                message: "No grades found"
            };
        }
        // Group grades by course
        const gradesByCourse = grades.reduce((acc, grade) => {
            const courseId = grade.courseId;
            if (!acc[courseId]) {
                acc[courseId] = [];
            }
            acc[courseId].push(grade);
            return acc;
        }, {});
        // Calculate average for each course
        const courseAverages = Object.entries(gradesByCourse).map(([courseId, courseGrades]) => {
            let totalWeightedScore = 0;
            let totalWeight = 0;
            courseGrades.forEach(grade => {
                const percentage = (grade.score / grade.maxScore) * 20;
                const weight = grade.weight || 1.0;
                totalWeightedScore += percentage * weight;
                totalWeight += weight;
            });
            const average = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
            return {
                courseId,
                courseName: courseGrades[0].course?.name || 'Unknown',
                courseCode: courseGrades[0].course?.code || 'N/A',
                average: Math.round(average * 100) / 100,
                gradeCount: courseGrades.length
            };
        });
        // Calculate general average
        const totalCourseAverage = courseAverages.reduce((sum, course) => sum + course.average, 0);
        const generalAverage = courseAverages.length > 0
            ? Math.round((totalCourseAverage / courseAverages.length) * 100) / 100
            : 0;
        return {
            generalAverage,
            courseAverages,
            totalCourses: courseAverages.length,
            totalGrades: grades.length
        };
    }
    /**
     * Get statistics for a user's grades
     */
    static async getGradeStatistics(userId) {
        const grades = await db_1.db.grade.findMany({
            where: { userId },
            include: { course: true }
        });
        if (grades.length === 0) {
            return {
                message: "No grades found",
                stats: null
            };
        }
        // Normalize all grades to /20
        const normalizedGrades = grades.map(g => (g.score / g.maxScore) * 20);
        // Calculate statistics
        const sorted = [...normalizedGrades].sort((a, b) => a - b);
        const sum = normalizedGrades.reduce((a, b) => a + b, 0);
        const mean = sum / normalizedGrades.length;
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
        const min = Math.min(...normalizedGrades);
        const max = Math.max(...normalizedGrades);
        // Standard deviation
        const variance = normalizedGrades.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / normalizedGrades.length;
        const standardDeviation = Math.sqrt(variance);
        // Grade distribution
        const distribution = {
            excellent: normalizedGrades.filter(g => g >= 16).length, // 16-20
            good: normalizedGrades.filter(g => g >= 14 && g < 16).length, // 14-16
            average: normalizedGrades.filter(g => g >= 12 && g < 14).length, // 12-14
            passing: normalizedGrades.filter(g => g >= 10 && g < 12).length, // 10-12
            failing: normalizedGrades.filter(g => g < 10).length // <10
        };
        return {
            stats: {
                mean: Math.round(mean * 100) / 100,
                median: Math.round(median * 100) / 100,
                min: Math.round(min * 100) / 100,
                max: Math.round(max * 100) / 100,
                standardDeviation: Math.round(standardDeviation * 100) / 100,
                totalGrades: grades.length,
                distribution
            }
        };
    }
}
exports.GradeService = GradeService;
