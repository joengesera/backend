// src/controllers/RiskController.ts
import { Request, Response } from 'express';
import { RiskService } from '../services/RiskService';

const getCourseRisk = async (req: Request, res: Response) => {
  const { courseId } = req.params;
  const userId = (req as any).user?.userId;

  if (!courseId) {
    return res.status(400).json({ error: "courseId est requis" });
  }

  if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const analysis = await RiskService.analyzeCourse(courseId as string, String(userId));
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export default {getCourseRisk};