# 🎓 Student Planner V2 - Backend Handover

## 🚀 Status
The backend is now **MVP Ready**. 
- Core CRUD operations are implemented.
- Authentication is secured (Tokens, Refresh, Reset Password).
- Logic placeholders (Risk, Sync) are functional and connected to the database.

## 🛠 Features Implemented

### 1. Authentication (`/api/auth`)
- `POST /register`: Create account.
- `POST /login`: Get Access + Refresh tokens.
- `POST /refresh-token`: Rotate access tokens.
- `POST /logout`: Invalidate session.
- `POST /forgot-password`: Initiate password reset.
- `POST /reset-password`: Complete password reset.

### 2. Academics (CRUD)
All routes below require `Authorization: Bearer <token>`
- **Courses** (`/api/courses`)
- **Tasks** (`/api/tasks`)
- **Events** (`/api/events`)
- **Grades** (`/api/grades`)

### 3. Advanced Features
- **Risk Analysis** (`/api/risk/course/:courseId`): Returns a calculated risk score (0-100) based on grades, deadlines, and task backlog.
- **Sync** (`/api/sync`):
    - `POST /push`: Upload changes (Tasks, Events, etc.) from client.
    - `GET /pull`: Download changes since `lastPulledAt`.

## 🧪 How to Test (Quick Walkthrough)

1. **Register**: `POST /api/auth/register` -> Get `token`.
2. **Create Course**: `POST /api/courses` with `{ "code": "CS101", "name": "Intro to CS" }`.
3. **Add Grade**: `POST /api/grades` linked to that course.
4. **Check Risk**: `GET /api/risk/course/:courseId` -> See if you are "At Risk".

## ⚠️ Known Limitations
- **Validation**: Basic validation exists, but strict Zod schemas should be added for production.
- **Sync**: Conflict resolution strategy is "Last Write Wins".
- **Events**: Deletion is currently "Hard Delete".

## 🏃‍♂️ Next Steps
1. Connect the Frontend !
2. Add Zod Validation Middlewares.
3. Test Sync with real device scenarios.
