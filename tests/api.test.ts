import request from 'supertest';
import app from '../src/app';
import { db } from '../src/lib/db';

let authToken: string;
let userId: string;
let courseId: string;
let taskId: string;

// Unique, random email for every test run to avoid conflict
const testEmail = `test.student.${Date.now()}@example.com`;
const testPassword = 'Password123!';

describe('🎓 Student Planner API - End-to-End Tests', () => {

    beforeAll(async () => {
        // Optional: Clean DB or connect
        // await db.$connect();
    });

    afterAll(async () => {
        // Cleanup: Delete the user created for tests
        if (userId) {
            await db.user.delete({ where: { id: userId } }).catch((error: any) => {
                console.error("Cleanup error", error.message)
            });
        }
        await db.$disconnect();
    });

    /**
     * AUTHENTICATION
     */
    describe('1. Authentication', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: testEmail,
                    name: 'Test Student',
                    password: testPassword
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('id');
            userId = res.body.user.id;
        });

        it('should login', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testEmail,
                    password: testPassword
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('tokens');
            expect(res.body.tokens).toHaveProperty('accessToken');
            authToken = res.body.tokens.accessToken;
        });
    });

    /**
     * ACADEMICS (CRUD)
     */
    describe('2. Academics', () => {
        it('should create a course', async () => {
            const res = await request(app)
                .post('/api/courses')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    code: 'TEST101',
                    name: 'Introduction to Testing',
                    color: '#FF0000',
                    credits: 3
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.code).toBe('TEST101');
            courseId = res.body.id;
        });

        it('should create a task for the course', async () => {
            const res = await request(app)
                .post('/api/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Finish Integration Tests',
                    status: 'PENDING',
                    priority: 'HIGH',
                    dueDate: new Date().toISOString(),
                    courseId: courseId
                });

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('Finish Integration Tests');
            taskId = res.body.id;
        });

        it('should add a grade', async () => {
            const res = await request(app)
                .post('/api/grades')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Midterm',
                    score: 15,
                    maxScore: 20,
                    courseId: courseId
                });

            expect(res.status).toBe(201);
            expect(res.body.score).toBe(15);
        });
    });

    /**
     * RISK ANALYSIS
     */
    describe('3. Risk Analysis', () => {
        it('should calculate risk for the course', async () => {
            const res = await request(app)
                .get(`/api/risk/course/${courseId}`)
                .query({ userId }) // Query param needed as per our temporary implementation? or handled by middleware now? Middleware handles it via token.
                .set('Authorization', `Bearer ${authToken}`); // Middleware sets req.user

            // Note: Controller currently reads userId from query in original implementation, 
            // BUT we updated it to use req.user from token! 
            // Let's ensure we are correct. 

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('overallScore');
            expect(res.body).toHaveProperty('level');
        });
    });

    /**
     * SYNC
     */
    describe('4. Synchronization', () => {
        it('should push a new offline task via Sync', async () => {
            const res = await request(app)
                .post('/api/sync/push')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    type: 'CREATE',
                    entity: 'Task',
                    userId: userId, // Body property might be redundant but previously expected
                    data: {
                        id: 'offline-task-uuid-' + Date.now(),
                        title: 'Offline Task',
                        status: 'PENDING',
                        priority: 'LOW'
                    }
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
