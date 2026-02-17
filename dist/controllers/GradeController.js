"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradeStatistics = exports.getCourseAverage = exports.getGeneralAverage = exports.deleteGrade = exports.updateGrade = exports.createGrade = exports.getGrades = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../lib/db");
const GradeService_1 = require("../services/GradeService");
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const validateScoreRange = (score, maxScore) => {
    if (!isFiniteNumber(score) || !isFiniteNumber(maxScore)) {
        return 'Score et maximum doivent etre des nombres valides';
    }
    if (maxScore <= 0)
        return 'Le maximum doit etre superieur a 0';
    if (score < 0 || score > maxScore) {
        return 'Le score doit etre compris entre 0 et le maximum';
    }
    return null;
};
const resolveWorkTypeId = async (courseId, workType) => {
    const configured = await db_1.db.courseWorkType.findMany({
        where: { courseId },
        select: { id: true, type: true }
    });
    if (configured.length === 0)
        return undefined;
    const requestedType = (workType || client_1.WorkType.EXAMEN);
    const match = configured.find((item) => item.type === requestedType);
    return match ? match.id : null;
};
const getGrades = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { courseId } = req.query;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const where = { userId };
        if (courseId)
            where.courseId = String(courseId);
        const grades = await db_1.db.grade.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                workType: { select: { type: true, weightPercent: true } }
            }
        });
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
        const { localId, name, score, maxScore, date, comment, courseId, workType } = req.body;
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        if (!name || !courseId) {
            return res.status(400).json({ error: 'Nom et cours sont requis' });
        }
        const course = await db_1.db.course.findUnique({
            where: { id: courseId },
            select: { id: true, userId: true }
        });
        if (!course)
            return res.status(404).json({ error: 'Course not found' });
        if (course.userId !== userId)
            return res.status(403).json({ error: 'Forbidden' });
        const scoreNum = Number(score);
        const maxScoreNum = maxScore === undefined ? 20 : Number(maxScore);
        const rangeError = validateScoreRange(scoreNum, maxScoreNum);
        if (rangeError)
            return res.status(400).json({ error: rangeError });
        const workTypeId = await resolveWorkTypeId(courseId, workType);
        if (workTypeId === null) {
            return res.status(400).json({ error: 'Type de travail non configure pour ce cours' });
        }
        const grade = await db_1.db.grade.create({
            data: {
                localId,
                userId,
                name,
                score: scoreNum,
                maxScore: maxScoreNum,
                date: date ? new Date(date) : undefined,
                comment,
                courseId,
                workTypeId: workTypeId || undefined
            },
            include: {
                workType: { select: { type: true, weightPercent: true } }
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
        const data = { ...req.body };
        if (!userId)
            return res.status(401).json({ error: 'Unauthorized' });
        const grade = await db_1.db.grade.findUnique({ where: { id } });
        if (!grade || grade.userId !== userId) {
            return res.status(404).json({ error: 'Grade not found' });
        }
        if (data.courseId !== undefined)
            delete data.courseId;
        if (data.weight !== undefined)
            delete data.weight;
        const nextScore = data.score !== undefined ? Number(data.score) : grade.score;
        const nextMaxScore = data.maxScore !== undefined ? Number(data.maxScore) : grade.maxScore;
        const rangeError = validateScoreRange(nextScore, nextMaxScore);
        if (rangeError)
            return res.status(400).json({ error: rangeError });
        if (data.score !== undefined)
            data.score = nextScore;
        if (data.maxScore !== undefined)
            data.maxScore = nextMaxScore;
        if (data.date)
            data.date = new Date(data.date);
        if (data.workType) {
            const workTypeId = await resolveWorkTypeId(grade.courseId, data.workType);
            if (workTypeId === null) {
                return res.status(400).json({ error: 'Type de travail non configure pour ce cours' });
            }
            data.workTypeId = workTypeId;
            delete data.workType;
        }
        const updated = await db_1.db.grade.update({
            where: { id },
            data: { ...data, updatedAt: new Date() },
            include: {
                workType: { select: { type: true, weightPercent: true } }
            }
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
            return res.status(401).json({ error: 'Unauthorized' });
        const grade = await db_1.db.grade.findUnique({ where: { id } });
        if (!grade || grade.userId !== userId) {
            return res.status(404).json({ error: 'Grade not found' });
        }
        await db_1.db.grade.delete({ where: { id } });
        res.json({ message: 'Grade deleted successfully' });
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
            return res.status(401).json({ error: 'Unauthorized' });
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
            return res.status(401).json({ error: 'Unauthorized' });
        const result = await GradeService_1.GradeService.getCourseAverage(userId, courseId);
        if (!result)
            return res.status(404).json({ error: 'No grades found for this course' });
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
            return res.status(401).json({ error: 'Unauthorized' });
        const result = await GradeService_1.GradeService.getGradeStatistics(userId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getGradeStatistics = getGradeStatistics;
