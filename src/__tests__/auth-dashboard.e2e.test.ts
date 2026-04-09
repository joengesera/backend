import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { AuthService } from '../services/AuthServices';
import { db } from '../lib/db';

jest.mock('../lib/db', () => ({
  db: {
    course: {
      findMany: jest.fn()
    }
  }
}));

describe('E2E auth -> dashboard data', () => {
  const loginPayload = {
    email: 'student@test.com',
    password: 'password123'
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    jest.clearAllMocks();
  });

  it('should login then access protected courses endpoint', async () => {
    const accessToken = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET as string, { expiresIn: '15m' });

    jest.spyOn(AuthService, 'login').mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'student@test.com',
        name: 'Student',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      tokens: {
        accessToken,
        refreshToken: 'refresh-token-value'
      }
    });

    (db.course.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'course-1',
        code: 'MATH101',
        name: 'Math',
        color: '#3B82F6',
        credits: 3,
        userId: 'user-1',
        isDeleted: false
      }
    ]);

    const loginResponse = await request(app).post('/api/auth/login').send(loginPayload);

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.tokens.accessToken).toBeDefined();

    const dashboardResponse = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${loginResponse.body.data.tokens.accessToken}`);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.success).toBe(true);
    expect(Array.isArray(dashboardResponse.body.data)).toBe(true);
    expect(dashboardResponse.body.data).toHaveLength(1);
  });

  it('should block dashboard endpoint without token', async () => {
    const response = await request(app).get('/api/courses');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBeDefined();
  });
});
