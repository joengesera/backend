import { db } from '../lib/db';
import { NotFoundError } from '../errors/http.errors';

export class UserService {
  async getUser(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        // Mock permissions for now based on role
        // In a real app, this would be a separate table or field
      }
    });

    if (!user) {
      throw new NotFoundError('Utilisateur introuvable');
    }

    // Assigning permissions based on role
    const permissions = user.role === 'PROFESSOR' 
      ? ['UPDATE_GRADE', 'UPDATE_SCHEDULE', 'ASSIGN_COURSE']
      : [];

    return { ...user, permissions };
  }
}
