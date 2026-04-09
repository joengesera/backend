import { Router } from 'express';
import * as EventController from '../controllers/EventController';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createEventSchema, updateEventSchema } from '../validators/event.validators';

const router = Router();

router.use(authenticateToken);

router.get('/', EventController.getEvents);
router.post('/', validate({ body: createEventSchema }), EventController.createEvent);
router.patch('/:id', validate({ body: updateEventSchema }), EventController.updateEvent);
router.delete('/:id', EventController.deleteEvent);

export default router;
