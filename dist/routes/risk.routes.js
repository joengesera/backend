"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/risk.routes.ts
const express_1 = require("express");
const RiskController_1 = __importDefault(require("../controllers/RiskController"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// On met la logique directement ici pour éviter l'erreur "handler must be a function"
router.get('/course/:courseId', /*async (req, res) => {
//   const { courseId } = req.params;
//   const userId = req.query.userId as string;

//   console.log(`🔍 Analyse de risque demandée pour le cours: ${courseId}`);

//   try {
//     const analysis = await RiskService.analyzeCourse(courseId, userId);
//     res.json(analysis);
//   } catch (error: any) {
//     console.error("❌ Erreur RiskService:", error.message);
//     res.status(500).json({ error: error.message });
//   }
} */ RiskController_1.default.getCourseRisk);
exports.default = router;
