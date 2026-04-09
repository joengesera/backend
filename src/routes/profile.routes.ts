import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/ProfileController";
import { authenticateToken } from "../middlewares/auth.middleware";
const router = Router();

router.use(authenticateToken);

router.get("/profile", getProfile);
router.put("/updateprofile", updateProfile);

export default router;

