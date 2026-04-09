import { Router } from 'express';
import * as TaskController from '../controllers/TaskController';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createTaskSchema, updateTaskSchema } from '../validators/task.validators';

const router = Router();

router.use(authenticateToken);

// Specific static routes first
router.get('/board', TaskController.getBoardTasks);
router.get('/focus/current', TaskController.getCurrentFocusTask);
router.post('/reorder', TaskController.reorderTasks);

// Specific parameterized routes
router.get('/event/:eventId', TaskController.getTasksByEvent);
router.post('/event/:eventId', TaskController.createTaskForEvent);
router.post('/:id/start', TaskController.startTask);
router.post('/:id/pause', TaskController.pauseTask);
router.post('/:id/complete', TaskController.completeTask);

// Generic routes last
router.get('/', TaskController.getTasks);
router.post('/', validate({ body: createTaskSchema }), TaskController.createTask);
router.patch('/:id', validate({ body: updateTaskSchema }), TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);


export default router;
