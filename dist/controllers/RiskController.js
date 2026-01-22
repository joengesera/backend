"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RiskService_1 = require("../services/RiskService");
const getCourseRisk = async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user?.userId;
    if (!courseId) {
        return res.status(400).json({ error: "courseId est requis" });
    }
    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const analysis = await RiskService_1.RiskService.analyzeCourse(courseId, String(userId));
        res.json(analysis);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.default = { getCourseRisk };
