// src/routes/risk.routes.ts
import { Router } from 'express';
import { RiskService } from '../services/RiskService';
import RiskController from '../controllers/RiskController';

import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

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
} */ RiskController.getCourseRisk);

export default router;