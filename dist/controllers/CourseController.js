"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.initCourseWorkTypes = exports.updateCourseWorkTypes = exports.getCourseWorkTypes = exports.createCourse = exports.searchCourses = exports.getCourseById = exports.getCourses = void 0;
const db_1 = require("../lib/db");
const courseWorkTypeService_1 = require("../services/courseWorkTypeService");
const apiResponse_1 = require("../utils/apiResponse");
const getUserId = (req) => req.user?.userId;
const getCourses = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const courses = await db_1.db.course.findMany({
            where: { userId, isDeleted: false },
            orderBy: { updatedAt: 'desc' }
        });
        (0, apiResponse_1.sendSuccess)(res, courses);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getCourses = getCourses;
const getCourseById = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const course = await db_1.db.course.findFirst({
            where: { id, userId, isDeleted: false }
        });
        if (!course)
            return (0, apiResponse_1.sendError)(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
        (0, apiResponse_1.sendSuccess)(res, course);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getCourseById = getCourseById;
const searchCourses = async (req, res) => {
    try {
        const query = String(req.query.q || '').trim();
        if (!query)
            return (0, apiResponse_1.sendSuccess)(res, []);
        const courses = await db_1.db.course.findMany({
            where: {
                OR: [
                    { code: { contains: query, mode: 'insensitive' } },
                    { name: { contains: query, mode: 'insensitive' } }
                ],
                isDeleted: false
            },
            distinct: ['code'],
            take: 10
        });
        (0, apiResponse_1.sendSuccess)(res, courses);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.searchCourses = searchCourses;
const createCourse = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { code, name, description, color, credits, workTypes } = req.body;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const normalized = (0, courseWorkTypeService_1.normalizeWorkTypes)(workTypes);
        if (!normalized.ok)
            return (0, apiResponse_1.sendError)(res, normalized.error, 400, 'INVALID_WORK_TYPES');
        const course = await db_1.db.$transaction(async (tx) => {
            const created = await tx.course.create({
                data: { userId, code, name, description, color, credits }
            });
            await tx.courseWorkType.createMany({
                data: normalized.items.map((item) => ({
                    courseId: created.id,
                    type: item.type,
                    weightPercent: item.weightPercent
                }))
            });
            return created;
        });
        (0, apiResponse_1.sendSuccess)(res, course, 201);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.createCourse = createCourse;
const getCourseWorkTypes = async (req, res) => {
    try {
        const userId = getUserId(req);
        const courseId = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const course = await db_1.db.course.findUnique({ where: { id: courseId } });
        if (!course || course.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
        }
        const workTypes = await db_1.db.courseWorkType.findMany({
            where: { courseId },
            orderBy: { type: 'asc' }
        });
        (0, apiResponse_1.sendSuccess)(res, workTypes);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.getCourseWorkTypes = getCourseWorkTypes;
const updateCourseWorkTypes = async (req, res) => {
    try {
        const userId = getUserId(req);
        const courseId = String(req.params.id);
        const { workTypes } = req.body;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const course = await db_1.db.course.findUnique({ where: { id: courseId } });
        if (!course || course.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
        }
        const normalized = (0, courseWorkTypeService_1.normalizeWorkTypes)(workTypes);
        if (!normalized.ok)
            return (0, apiResponse_1.sendError)(res, normalized.error, 400, 'INVALID_WORK_TYPES');
        const existing = await db_1.db.courseWorkType.findMany({ where: { courseId } });
        const keepTypes = new Set(normalized.items.map((item) => item.type));
        const toDelete = existing.filter((item) => !keepTypes.has(item.type));
        if (toDelete.length > 0) {
            const [usedByGrades, usedByWorks] = await db_1.db.$transaction([
                db_1.db.grade.count({ where: { courseId, workTypeId: { in: toDelete.map((item) => item.id) } } }),
                db_1.db.work.count({ where: { courseId, workTypeId: { in: toDelete.map((item) => item.id) } } })
            ]);
            if (usedByGrades > 0 || usedByWorks > 0) {
                return (0, apiResponse_1.sendError)(res, 'Impossible de supprimer un type deja utilise par des notes ou des travaux.', 400, 'WORK_TYPE_IN_USE');
            }
        }
        await db_1.db.$transaction([
            db_1.db.courseWorkType.deleteMany({ where: { id: { in: toDelete.map((item) => item.id) } } }),
            ...normalized.items.map((item) => db_1.db.courseWorkType.upsert({
                where: { courseId_type: { courseId, type: item.type } },
                update: { weightPercent: item.weightPercent },
                create: { courseId, type: item.type, weightPercent: item.weightPercent }
            }))
        ]);
        const updated = await db_1.db.courseWorkType.findMany({
            where: { courseId },
            orderBy: { type: 'asc' }
        });
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.updateCourseWorkTypes = updateCourseWorkTypes;
const initCourseWorkTypes = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const courses = await db_1.db.course.findMany({
            where: { userId, isDeleted: false },
            select: { id: true }
        });
        if (courses.length === 0)
            return (0, apiResponse_1.sendSuccess)(res, { created: 0 });
        const courseIds = courses.map((course) => course.id);
        const existing = await db_1.db.courseWorkType.findMany({
            where: { courseId: { in: courseIds } },
            select: { courseId: true }
        });
        const existingSet = new Set(existing.map((item) => item.courseId));
        const missing = courseIds.filter((id) => !existingSet.has(id));
        if (missing.length === 0)
            return (0, apiResponse_1.sendSuccess)(res, { created: 0 });
        const defaults = (0, courseWorkTypeService_1.normalizeWorkTypes)();
        if (!defaults.ok) {
            return (0, apiResponse_1.sendError)(res, "Impossible d'initialiser les types de travaux.", 500, 'INIT_WORK_TYPES_FAILED');
        }
        await db_1.db.courseWorkType.createMany({
            data: missing.flatMap((courseId) => defaults.items.map((item) => ({
                courseId,
                type: item.type,
                weightPercent: item.weightPercent
            })))
        });
        (0, apiResponse_1.sendSuccess)(res, { created: missing.length });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.initCourseWorkTypes = initCourseWorkTypes;
const updateCourse = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        const data = req.body;
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const course = await db_1.db.course.findUnique({ where: { id } });
        if (!course || course.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
        }
        const updated = await db_1.db.course.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        (0, apiResponse_1.sendSuccess)(res, updated);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.updateCourse = updateCourse;
const deleteCourse = async (req, res) => {
    try {
        const userId = getUserId(req);
        const id = String(req.params.id);
        if (!userId)
            return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
        const course = await db_1.db.course.findUnique({ where: { id } });
        if (!course || course.userId !== userId) {
            return (0, apiResponse_1.sendError)(res, 'Cours introuvable.', 404, 'COURSE_NOT_FOUND');
        }
        await db_1.db.course.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        (0, apiResponse_1.sendSuccess)(res, { message: 'Cours supprime avec succes.' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.deleteCourse = deleteCourse;
