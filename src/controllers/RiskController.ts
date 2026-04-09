import { Request, Response } from 'express';
import { RiskService } from '../services/RiskService';
import { sendError, sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const getCourseRisk = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const userId = (req as AuthenticatedRequest).user?.userId;

  if (!courseId) return sendError(res, 'courseId est requis.', 400, 'MISSING_COURSE_ID');
  if (!userId) return sendError(res, 'Non autorise.', 401, 'UNAUTHORIZED');

  try {
    const analysis = await RiskService.analyzeCourse(String(courseId), userId);
    sendSuccess(res, analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur interne';
    sendError(res, message);
  }
};

export default { getCourseRisk };
