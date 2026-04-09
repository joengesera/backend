import { Router } from 'express';
import * as WorkController from '../controllers/WorkController';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', WorkController.getWorks);
router.post('/', WorkController.createWork);
router.patch('/:id', WorkController.updateWork);
router.delete('/:id', WorkController.deleteWork);
router.post('/:id/recalculate-points', WorkController.recalculateWorkPoints);

export default router;
