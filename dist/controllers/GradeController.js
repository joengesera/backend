"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradeStatistics = exports.getCourseAverage = exports.getGeneralAverage = exports.deleteGrade = exports.updateGrade = exports.createGrade = exports.getGrades = void 0;
const db_1 = require("../lib/db");
const GradeService_1 = require("../services/GradeService");
const getGrades = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { courseId } = req.query;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const where = { userId };
        if (courseId)
            where.courseId = String(courseId);
        const grades = await db_1.db.grade.findMany({ where, orderBy: { date: 'desc' } });
        res.json(grades);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getGrades = getGrades;
const createGrade = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { name, score, maxScore, weight, date, comment, courseId } = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const grade = await db_1.db.grade.create({
            data: {
                userId,
                name,
                score,
                maxScore: maxScore || 20,
                weight: weight || 1.0,
                date: date ? new Date(date) : undefined,
                comment,
                courseId
            }
        });
        res.status(201).json(grade);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.createGrade = createGrade;
const updateGrade = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const data = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const grade = await db_1.db.grade.findUnique({ where: { id } });
        if (!grade || grade.userId !== userId) {
            return res.status(404).json({ error: "Grade not found" });
        }
        if (data.date)
            data.date = new Date(data.date);
        const updated = await db_1.db.grade.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updateGrade = updateGrade;
const deleteGrade = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const grade = await db_1.db.grade.findUnique({ where: { id } });
        if (!grade || grade.userId !== userId) {
            return res.status(404).json({ error: "Grade not found" });
        }
        await db_1.db.grade.delete({ where: { id } });
        res.json({ message: "Grade deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteGrade = deleteGrade;
const getGeneralAverage = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const result = await GradeService_1.GradeService.getGeneralAverage(userId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getGeneralAverage = getGeneralAverage;
const getCourseAverage = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const courseId = req.params.courseId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const result = await GradeService_1.GradeService.getCourseAverage(userId, courseId);
        if (!result) {
            return res.status(404).json({ error: "No grades found for this course" });
        }
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCourseAverage = getCourseAverage;
const getGradeStatistics = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const result = await GradeService_1.GradeService.getGradeStatistics(userId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getGradeStatistics = getGradeStatistics;
