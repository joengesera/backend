import { Router } from 'express';
import * as CourseController from '../controllers/CourseController';
import { authenticateToken } from '../middlewares/auth.middleware'; 

const router = Router();

router.use(authenticateToken); // Protect all course routes

router.get('/', CourseController.getCourses);
router.get('/search', CourseController.searchCourses);
router.post('/work-types/init', CourseController.initCourseWorkTypes);
router.get('/:id/work-types', CourseController.getCourseWorkTypes);
router.get('/:id', CourseController.getCourseById);
router.post('/', CourseController.createCourse);
router.put('/:id/work-types', CourseController.updateCourseWorkTypes);
router.patch('/:id', CourseController.updateCourse);
router.delete('/:id', CourseController.deleteCourse);

export default router;
