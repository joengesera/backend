import { Router } from "express";
import { handleSyncPush, handleSyncPull } from "../controllers/SyncController";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.post('/push', handleSyncPush);
router.get('/pull', handleSyncPull);

export default router;
