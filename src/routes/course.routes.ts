import { Router } from 'express';
import * as CourseController from '../controllers/CourseController';
import { authenticateToken } from '../middlewares/auth.middleware'; 

const router = Router();

router.use(authenticateToken); // Protect all course routes

router.get('/', CourseController.getCourses);
router.post('/', CourseController.createCourse);
router.patch('/:id', CourseController.updateCourse);
router.delete('/:id', CourseController.deleteCourse);

export default router;
