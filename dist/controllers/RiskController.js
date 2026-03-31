"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RiskService_1 = require("../services/RiskService");
const apiResponse_1 = require("../utils/apiResponse");
const getCourseRisk = async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user?.userId;
    if (!courseId)
        return (0, apiResponse_1.sendError)(res, 'courseId est requis.', 400, 'MISSING_COURSE_ID');
    if (!userId)
        return (0, apiResponse_1.sendError)(res, 'Non autorise.', 401, 'UNAUTHORIZED');
    try {
        const analysis = await RiskService_1.RiskService.analyzeCourse(String(courseId), userId);
        (0, apiResponse_1.sendSuccess)(res, analysis);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur interne';
        (0, apiResponse_1.sendError)(res, message);
    }
};
exports.default = { getCourseRisk };
