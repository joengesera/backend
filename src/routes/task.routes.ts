import { Router } from 'express';
import * as TaskController from '../controllers/TaskController';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.patch('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);

export default router;
