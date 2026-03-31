import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { ProfessorService } from '../services/ProfessorService';
import { ProfessorRepository } from '../repositories/professor.repository';
import { ConsoleAuditService } from '../services/AuditService';
import { InMemoryCacheService } from '../services/CacheService';
import { UserService } from '../services/UserService';
import { UnauthorizedError, ValidationError } from '../errors/http.errors';
import { sendSuccess } from '../utils/apiResponse';

const auditService = new ConsoleAuditService();
const cacheService = new InMemoryCacheService();
const userService = new UserService();
const repository = new ProfessorRepository();
const professorService = new ProfessorService(repository, auditService, cacheService, userService);

const getUserIdFromRequest = (req: AuthenticatedRequest) => req.user?.userId;
const getSinglePathParam = (param: string | string[] | undefined) =>
  Array.isArray(param) ? param[0] : param;

export const updateGrade = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const professorId = getUserIdFromRequest(req);
    if (!professorId) throw new UnauthorizedError('Utilisateur non authentifie.');

    const grade = await professorService.updateGrade(professorId, req.body);
    sendSuccess(res, grade);
  } catch (error) {
    next(error);
  }
};

export const updateSchedule = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const professorId = getUserIdFromRequest(req);
    if (!professorId) throw new UnauthorizedError('Utilisateur non authentifie.');

    const courseId = getSinglePathParam(req.params.courseId);
    if (!courseId) throw new ValidationError('courseId est requis dans l URL.');

    const events = req.body.events;
    if (!Array.isArray(events)) throw new ValidationError('events doit etre un tableau.');

    const updatedEvents = await professorService.updateSchedule(professorId, courseId, events);
    sendSuccess(res, updatedEvents);
  } catch (error) {
    next(error);
  }
};

export const assignCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const professorId = getUserIdFromRequest(req);
    if (!professorId) throw new UnauthorizedError('Utilisateur non authentifie.');

    const courseId = getSinglePathParam(req.params.courseId);
    if (!courseId) throw new ValidationError('courseId est requis dans l URL.');

    const professor = await professorService.assignToCourse(professorId, courseId);
    sendSuccess(res, { message: 'Cours assigne au professeur.', professor });
  } catch (error) {
    next(error);
  }
};

export const getMyCourses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const professorId = getUserIdFromRequest(req);
    if (!professorId) throw new UnauthorizedError('Utilisateur non authentifie.');

    const courses = await professorService.getMyCourses(professorId);
    sendSuccess(res, courses);
  } catch (error) {
    next(error);
  }
};

export const getStudentsByCourseCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const professorId = getUserIdFromRequest(req);
    const code = getSinglePathParam(req.params.code);
    if (!professorId) throw new UnauthorizedError('Utilisateur non authentifie.');
    if (!code) throw new ValidationError('code est requis.');

    const students = await professorService.getStudentsInCourse(professorId, code);
    sendSuccess(res, students);
  } catch (error) {
    next(error);
  }
};
