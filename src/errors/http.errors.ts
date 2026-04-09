import { AppError } from './AppError';

export class HttpError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode);
  }
}

export class ValidationError extends HttpError {
  constructor(message: string = 'Validation échouée') {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = 'Non autorisé') {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = 'Accès interdit') {
    super(message, 403);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = 'Ressource introuvable') {
    super(message, 404);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string = 'Erreur interne du serveur') {
    super(message, 500);
  }
}
