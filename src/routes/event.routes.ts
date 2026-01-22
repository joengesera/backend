import { Router } from 'express';
import * as EventController from '../controllers/EventController';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', EventController.getEvents);
router.post('/', EventController.createEvent);
router.patch('/:id', EventController.updateEvent);
router.delete('/:id', EventController.deleteEvent);

export default router;
