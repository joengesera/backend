import { Router } from 'express';
import * as ProfessorController from '../controllers/ProfessorController';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requireProfessorRole } from '../middlewares/professor.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireProfessorRole);

router.post('/grades', ProfessorController.updateGrade);
router.get('/courses', ProfessorController.getMyCourses);
router.get('/courses/:code/students', ProfessorController.getStudentsByCourseCode);
router.patch('/courses/:courseId/events', ProfessorController.updateSchedule);
router.post('/courses/:courseId/assign', ProfessorController.assignCourse);

export default router;
