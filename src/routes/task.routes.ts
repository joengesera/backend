import { Router } from 'express';
import * as TaskController from '../controllers/TaskController';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/board', TaskController.getBoardTasks);
router.get('/focus/current', TaskController.getCurrentFocusTask);
router.get('/event/:eventId', TaskController.getTasksByEvent);
router.post('/event/:eventId', TaskController.createTaskForEvent);
router.post('/reorder', TaskController.reorderTasks);
router.post('/:id/start', TaskController.startTask);
router.post('/:id/pause', TaskController.pauseTask);
router.post('/:id/complete', TaskController.completeTask);

router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.patch('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);

export default router;
