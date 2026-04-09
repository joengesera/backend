// src/routes/risk.routes.ts
// CORRECTIF: code mort (bloc commenté) supprimé — import RiskService inutilisé retiré
import { Router } from 'express';
import RiskController from '../controllers/RiskController';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/course/:courseId', RiskController.getCourseRisk);

export default router;