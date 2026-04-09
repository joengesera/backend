"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/risk.routes.ts
// CORRECTIF: code mort (bloc commenté) supprimé — import RiskService inutilisé retiré
const express_1 = require("express");
const RiskController_1 = __importDefault(require("../controllers/RiskController"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
router.get('/course/:courseId', RiskController_1.default.getCourseRisk);
exports.default = router;
