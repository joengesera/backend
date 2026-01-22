import { Router } from 'express';
import * as GradeController from '../controllers/GradeController';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', GradeController.getGrades);
router.get('/average', GradeController.getGeneralAverage);
router.get('/statistics', GradeController.getGradeStatistics);
router.get('/course/:courseId/average', GradeController.getCourseAverage);
router.post('/', GradeController.createGrade);
router.patch('/:id', GradeController.updateGrade);
router.delete('/:id', GradeController.deleteGrade);

export default router;
