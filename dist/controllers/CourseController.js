"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.createCourse = exports.getCourses = void 0;
const db_1 = require("../lib/db");
const getCourses = async (req, res) => {
    try {
        const userId = req.user?.userId; // Assumes auth middleware adds user to req
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const courses = await db_1.db.course.findMany({
            where: { userId, isDeleted: false }
        });
        res.json(courses);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getCourses = getCourses;
const createCourse = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { code, name, description, color, credits } = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const course = await db_1.db.course.create({
            data: {
                userId,
                code,
                name,
                description,
                color,
                credits
            }
        });
        res.status(201).json(course);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.createCourse = createCourse;
const updateCourse = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = String(req.params.id);
        const data = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const course = await db_1.db.course.findUnique({ where: { id } });
        if (!course || course.userId !== userId) {
            return res.status(404).json({ error: "Course not found" });
        }
        const updated = await db_1.db.course.update({
            where: { id },
            data: { ...data, updatedAt: new Date() }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updateCourse = updateCourse;
const deleteCourse = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const id = String(req.params.id);
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const course = await db_1.db.course.findUnique({ where: { id } });
        if (!course || course.userId !== userId) {
            return res.status(404).json({ error: "Course not found" });
        }
        // Soft delete
        await db_1.db.course.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        res.json({ message: "Course deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.deleteCourse = deleteCourse;
