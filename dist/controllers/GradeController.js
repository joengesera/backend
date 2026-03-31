"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradeStatistics = exports.getCourseAverage = exports.getGeneralAverage = exports.deleteGrade = exports.updateGrade = exports.createGrade = exports.getGrades = void 0;
const db_1 = require("../lib/db");
const GradeService_1 = require("../services/GradeService");
const apiResponse_1 = require("../utils/apiResponse");
const getUserId = (req) => req.user?.userId;
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const validateScoreRange = (score, maxScore) => {
    if (!isFiniteNumber(score) || !isFiniteNumber(maxScore)) {
        return 'Score et maximum doivent etre des nombres valides';
    }
    if (maxScore <= 0)
        return 'Le maximum doit etre superieur a 0';
    if (score < 0 || score > maxScore)
        return 'Le score doit etre compris entre 0 et le maximum';
    return null;
};
const resolveWorkTypeId = async (courseId, workType) => {
    const configured = await db_1.db.courseWorkType.findMany({
        where: { courseId },
        select: { id: true, type: true }
    });
    if (configured.length === 0 || !workType)
        return undefined;
    const normalized = String(workType).trim().toUpperCase();
    const match = configured.find((item) => item.type.toUpperCase() === normalized);
    return match ? match.id : undefined;
};
const getGrades = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { courseId } = req.query;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const where = { userId };
        if (courseId)
            where.courseId = String(courseId);
        const grades = await db_1.db.grade.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                workType: { select: { type: true, weightPercent: true } },
                work: { select: { id: true, title: true } }
            }
        });
        (0, apiResponse_1.sendSuccess)(res, grades);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getGrades = getGrades;
const createGrade = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { localId, name, score, maxScore, date, comment, courseId, workId, workType, workTypeLabel, percentage } = req.body;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        if (!name || !courseId)
            return (0, apiResponse_1.sendError)(res, 'Nom et cours sont requis.', 400, 'MISSING_FIELDS');
        const course = await db_1.db.course.findUnique({ where: { id: courseId }, select: { id: true, userId: true } });
        if (!course)
            return (0, apiResponse_1.sendError)(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
        if (course.userId !== userId)
            return (0, apiResponse_1.sendError)(res, 'Acces refuse.', 403, 'FORBIDDEN');
        const scoreNum = Number(score);
        const maxScoreNum = maxScore === undefined ? 20 : Number(maxScore);
        const percentageNum = percentage === undefined || percentage === null || percentage === '' ? undefined : Number(percentage);
        const rangeError = validateScoreRange(scoreNum, maxScoreNum);
        if (rangeError)
            return (0, apiResponse_1.sendError)(res, rangeError, 400, 'INVALID_SCORE_RANGE');
        if (percentageNum !== undefined && (!Number.isFinite(percentageNum) || percentageNum < 0 || percentageNum > 100)) {
            return (0, apiResponse_1.sendError)(res, 'Le pourcentage doit etre compris entre 0 et 100.', 400, 'INVALID_PERCENTAGE');
        }
        const normalizedLabel = String(workTypeLabel || workType || '').trim().toUpperCase() || null;
        let resolvedWorkId;
        let resolvedWorkTypeId = await resolveWorkTypeId(courseId, normalizedLabel || undefined);
        if (workId) {
            const work = await db_1.db.work.findUnique({
                where: { id: String(workId) },
                select: { id: true, userId: true, courseId: true, workTypeId: true }
            });
            if (!work)
                return (0, apiResponse_1.sendError)(res, 'Travail introuvable.', 404, 'WORK_NOT_FOUND');
            if (work.userId !== userId)
                return (0, apiResponse_1.sendError)(res, 'Acces refuse.', 403, 'FORBIDDEN');
            if (work.courseId !== courseId) {
                return (0, apiResponse_1.sendError)(res, 'Le travail doit appartenir au meme cours.', 400, 'INVALID_WORK_COURSE');
            }
            resolvedWorkId = work.id;
            resolvedWorkTypeId = resolvedWorkTypeId || work.workTypeId || undefined;
        }
        const grade = await db_1.db.grade.create({
            data: {
                localId,
                userId,
                name,
                score: scoreNum,
                maxScore: maxScoreNum,
                percentage: percentageNum,
                workTypeLabel: normalizedLabel,
                workId: resolvedWorkId,
                date: date ? new Date(date) : undefined,
                comment,
                courseId,
                workTypeId: resolvedWorkTypeId || undefined
            },
            include: {
                workType: { select: { type: true, weightPercent: true } },
                work: { select: { id: true, title: true } }
            }
        });
        (0, apiResponse_1.sendSuccess)(res, grade, 201);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.createGrade = createGrade;
const updateGrade = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const data = { ...req.body };
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const grade = await db_1.db.grade.findUnique({ where: { id } });
        if (!grade || grade.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Note introuvable.', 404, 'GRADE_NOT_FOUND');
        }
        if (data.courseId !== undefined)
            delete data.courseId;
        if (data.weight !== undefined)
            delete data.weight;
        const nextScore = data.score !== undefined ? Number(data.score) : grade.score;
        const nextMaxScore = data.maxScore !== undefined ? Number(data.maxScore) : grade.maxScore;
        const rangeError = validateScoreRange(nextScore, nextMaxScore);
        if (rangeError)
            return (0, apiResponse_1.sendError)(res, rangeError, 400, 'INVALID_SCORE_RANGE');
        if (data.score !== undefined)
            data.score = nextScore;
        if (data.maxScore !== undefined)
            data.maxScore = nextMaxScore;
        if (data.date)
            data.date = new Date(data.date);
        if (data.percentage !== undefined && data.percentage !== null && data.percentage !== '') {
            const p = Number(data.percentage);
            if (!Number.isFinite(p) || p < 0 || p > 100) {
                return (0, apiResponse_1.sendError)(res, 'Le pourcentage doit etre compris entre 0 et 100.', 400, 'INVALID_PERCENTAGE');
            }
            data.percentage = p;
        }
        const incomingWorkType = data.workTypeLabel || data.workType;
        if (incomingWorkType !== undefined) {
            const normalized = String(incomingWorkType || '').trim().toUpperCase();
            data.workTypeLabel = normalized || null;
            data.workTypeId = normalized ? await resolveWorkTypeId(grade.courseId, normalized) : null;
            delete data.workType;
        }
        if (data.workId !== undefined) {
            if (data.workId === null || data.workId === '') {
                data.workId = null;
            }
            else {
                const work = await db_1.db.work.findUnique({
                    where: { id: String(data.workId) },
                    select: { id: true, userId: true, courseId: true, workTypeId: true }
                });
                if (!work)
                    return (0, apiResponse_1.sendError)(res, 'Travail introuvable.', 404, 'WORK_NOT_FOUND');
                if (work.userId !== userId)
                    return (0, apiResponse_1.sendError)(res, 'Acces refuse.', 403, 'FORBIDDEN');
                if (work.courseId !== grade.courseId) {
                    return (0, apiResponse_1.sendError)(res, 'Le travail doit appartenir au meme cours.', 400, 'INVALID_WORK_COURSE');
                }
                if (!data.workTypeId && !data.workTypeLabel) {
                    data.workTypeId = work.workTypeId || null;
                }
                data.workId = work.id;
            }
        }
        const updated = await db_1.db.grade.update({
            where: { id },
            data: { ...data, updatedAt: new Date() },
            include: {
                workType: { select: { type: true, weightPercent: true } },
                work: { select: { id: true, title: true } }
            }
        });
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.updateGrade = updateGrade;
const deleteGrade = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const grade = await db_1.db.grade.findUnique({ where: { id } });
        if (!grade || grade.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Note introuvable.', 404, 'GRADE_NOT_FOUND');
        }
        await db_1.db.grade.delete({ where: { id } });
        (0, apiResponse_1.sendSuccess)(res, { message: 'Note supprimee avec succes.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.deleteGrade = deleteGrade;
const getGeneralAverage = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const result = await GradeService_1.GradeService.getGeneralAverage(userId);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getGeneralAverage = getGeneralAverage;
const getCourseAverage = async (req, res) => {
    try {
        const userId = getUserId(req);
        const courseId = req.params.courseId;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const result = await GradeService_1.GradeService.getCourseAverage(userId, courseId);
        if (!result)
            return (0, apiResponse_1.sendError)(res, 'Aucune note trouvee pour ce cours.', 404, 'NO_GRADES');
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getCourseAverage = getCourseAverage;
const getGradeStatistics = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const result = await GradeService_1.GradeService.getGradeStatistics(userId);
        (0, apiResponse_1.sendSuccess)(res, result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getGradeStatistics = getGradeStatistics;
