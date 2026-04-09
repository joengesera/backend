# API Endpoints Documentation

Base URL: `http://localhost:3000`

## Authentication Endpoints

### 1. Register
**POST** `/api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "StrongP@ssw0rd"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-02-24T10:00:00Z",
    "updatedAt": "2026-02-24T10:00:00Z"
  },
  "tokens": {
    "accessToken": "jwt_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

---

### 2. Login
**POST** `/api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongP@ssw0rd"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "tokens": {
    "accessToken": "jwt_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

---

### 3. Refresh Token
**POST** `/api/auth/refresh-token`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200):**
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

---

### 4. Logout
**POST** `/api/auth/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200):**
```json
{
  "message": "Déconnexion réussie"
}
```

---

### 5. Forgot Password
**POST** `/api/auth/forgot-password`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "Si ce compte existe, un email de réinitialisation a été envoyé"
}
```

---

### 6. Reset Password
**POST** `/api/auth/reset-password`

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewStrongP@ssw0rd"
}
```

**Response (200):**
```json
{
  "message": "Mot de passe réinitialisé avec succès"
}
```

---

## Course Endpoints

### 1. Get All Courses
**GET** `/api/courses`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "code": "MAT101",
    "name": "Mathematics",
    "description": "Basic mathematics",
    "color": "#FF5733",
    "credits": 3,
    "isDeleted": false,
    "createdAt": "2026-02-24T10:00:00Z",
    "updatedAt": "2026-02-24T10:00:00Z"
  }
]
```

---

### 2. Create Course
**POST** `/api/courses`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "code": "MAT101",
  "name": "Mathematics",
  "description": "Basic mathematics",
  "color": "#FF5733",
  "credits": 3,
  "workTypes": [
    {
      "type": "EXAMEN",
      "weightPercent": 50
    },
    {
      "type": "INTERRO",
      "weightPercent": 25
    },
    {
      "type": "TP",
      "weightPercent": 25
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "code": "MAT101",
  "name": "Mathematics",
  "description": "Basic mathematics",
  "color": "#FF5733",
  "credits": 3
}
```

---

### 3. Update Course
**PATCH** `/api/courses/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "code": "MAT102",
  "name": "Advanced Mathematics",
  "description": "Advanced topics",
  "color": "#FF5733",
  "credits": 4
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "code": "MAT102",
  "name": "Advanced Mathematics",
  "description": "Advanced topics",
  "color": "#FF5733",
  "credits": 4
}
```

---

### 4. Delete Course
**DELETE** `/api/courses/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Cours supprimé avec succès"
}
```

---

### 5. Get Course Work Types
**GET** `/api/courses/:id/work-types`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "courseId": "uuid",
    "type": "EXAMEN",
    "weightPercent": 50
  }
]
```

---

### 6. Update Course Work Types
**PUT** `/api/courses/:id/work-types`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "workTypes": [
    { "type": "EXAMEN", "weightPercent": 60 },
    { "type": "PROJET", "weightPercent": 40 }
  ]
}
```

**Response (200):**
```json
{
  "message": "Types de travaux mis à jour"
}
```

---

## Task Endpoints

### 1. Get All Tasks
**GET** `/api/tasks?courseId=optional&eventId=optional`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `courseId` (optional): Filter by course
- `eventId` (optional): Filter by event

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "title": "Complete assignment",
    "description": "Math homework",
    "status": "PENDING",
    "priority": "HIGH",
    "dueDate": "2026-02-28T23:59:59Z",
    "courseId": "uuid",
    "eventId": null,
    "durationMinutes": 60,
    "timeSpentMinutes": 0,
    "position": 0,
    "startedAt": null,
    "completedAt": null,
    "isDeleted": false,
    "createdAt": "2026-02-24T10:00:00Z",
    "updatedAt": "2026-02-24T10:00:00Z"
  }
]
```

---

### 2. Create Task
**POST** `/api/tasks`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "title": "Complete assignment",
  "description": "Math homework",
  "status": "PENDING",
  "priority": "HIGH",
  "dueDate": "2026-02-28T23:59:59Z",
  "courseId": "uuid",
  "eventId": null,
  "durationMinutes": 60
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "Complete assignment",
  "description": "Math homework",
  "status": "PENDING",
  "priority": "HIGH",
  "dueDate": "2026-02-28T23:59:59Z",
  "courseId": "uuid",
  "eventId": null,
  "durationMinutes": 60,
  "timeSpentMinutes": 0,
  "position": 0,
  "startedAt": null,
  "completedAt": null,
  "createdAt": "2026-02-24T10:00:00Z"
}
```

---

### 3. Update Task
**PATCH** `/api/tasks/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "IN_PROGRESS",
  "priority": "MEDIUM",
  "dueDate": "2026-03-01T23:59:59Z",
  "durationMinutes": 90
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "Updated title",
  "status": "IN_PROGRESS",
  "priority": "MEDIUM",
  "updatedAt": "2026-02-24T11:00:00Z"
}
```

---

### 4. Delete Task
**DELETE** `/api/tasks/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Task deleted successfully"
}
```

---

### 5. Start Task
**POST** `/api/tasks/:id/start`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "IN_PROGRESS",
  "startedAt": "2026-02-24T11:05:00Z"
}
```

---

### 6. Pause Task
**POST** `/api/tasks/:id/pause`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "PAUSED",
    "timeSpentMinutes": 15
  }
}
```

---

### 7. Complete Task
**POST** `/api/tasks/:id/complete`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "completedAt": "2026-02-24T11:20:00Z"
}
```

---

### 8. Get Board Tasks
**GET** `/api/tasks/board?from=optional&to=optional`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `from` (optional): Start date (ISO format)
- `to` (optional): End date (ISO format)

**Response (200):**
```json
{
  "events": [
    {
      "id": "uuid",
      "title": "Math Exam",
      "startDate": "2026-02-28T09:00:00Z",
      "endDate": "2026-02-28T11:00:00Z",
      "tasks": [
        {
          "id": "uuid",
          "title": "Prepare notes",
          "status": "COMPLETED"
        }
      ]
    }
  ]
}
```

---

### 9. Get Focus Task
**GET** `/api/tasks/focus/current`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Current focus task",
  "status": "IN_PROGRESS",
  "startedAt": "2026-02-24T10:00:00Z"
}
```

---

### 10. Get Tasks by Event
**GET** `/api/tasks/event/:eventId`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "title": "Prepare exam",
    "eventId": "uuid",
    "status": "PENDING"
  }
]
```

---

### 11. Create Task for Event
**POST** `/api/tasks/event/:eventId`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "title": "Prepare exam",
  "description": "Study notes",
  "status": "PENDING",
  "priority": "HIGH",
  "durationMinutes": 120
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "title": "Prepare exam",
  "eventId": "uuid",
  "status": "PENDING"
}
```

---

### 12. Reorder Tasks
**POST** `/api/tasks/reorder`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "items": [
    { "id": "task-1", "position": 0 },
    { "id": "task-2", "position": 1 },
    { "id": "task-3", "position": 2 }
  ]
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

## Event Endpoints

### 1. Get All Events
**GET** `/api/events`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "title": "Math Exam",
    "description": "Final exam",
    "type": "EXAM",
    "courseId": "uuid",
    "startDate": "2026-02-28T09:00:00Z",
    "endDate": "2026-02-28T11:00:00Z",
    "color": "#FF5733",
    "isDeleted": false,
    "createdAt": "2026-02-24T10:00:00Z"
  }
]
```

---

### 2. Create Event
**POST** `/api/events`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "title": "Math Exam",
  "description": "Final exam",
  "type": "EXAM",
  "courseId": "uuid",
  "startDate": "2026-02-28T09:00:00Z",
  "endDate": "2026-02-28T11:00:00Z",
  "color": "#FF5733"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "title": "Math Exam",
  "type": "EXAM",
  "startDate": "2026-02-28T09:00:00Z",
  "endDate": "2026-02-28T11:00:00Z"
}
```

---

### 3. Update Event
**PATCH** `/api/events/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "title": "Midterm Exam",
  "description": "Midterm exam",
  "type": "EXAM",
  "startDate": "2026-03-01T09:00:00Z",
  "endDate": "2026-03-01T11:00:00Z"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Midterm Exam",
  "updatedAt": "2026-02-24T11:00:00Z"
}
```

---

### 4. Delete Event
**DELETE** `/api/events/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Événement supprimé avec succès"
}
```

---

## Grade Endpoints

### 1. Get All Grades
**GET** `/api/grades?courseId=optional&startDate=optional&endDate=optional`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `courseId` (optional): Filter by course
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "courseId": "uuid",
    "name": "Quiz 1",
    "score": 85,
    "maxScore": 100,
    "percentage": 85,
    "createdAt": "2026-02-24T10:00:00Z"
  }
]
```

---

### 2. Create Grade
**POST** `/api/grades`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "courseId": "uuid",
  "name": "Quiz 1",
  "score": 85,
  "maxScore": 100
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "name": "Quiz 1",
  "score": 85,
  "maxScore": 100,
  "percentage": 85
}
```

---

### 3. Update Grade
**PATCH** `/api/grades/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "score": 90,
  "maxScore": 100
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "score": 90,
  "percentage": 90,
  "updatedAt": "2026-02-24T11:00:00Z"
}
```

---

### 4. Delete Grade
**DELETE** `/api/grades/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Note supprimée avec succès"
}
```

---

### 5. Get General Average
**GET** `/api/grades/average`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "average": 82.5,
  "totalGrades": 10
}
```

---

### 6. Get Grade Statistics
**GET** `/api/grades/statistics`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "totalGrades": 10,
  "average": 82.5,
  "highestScore": 95,
  "lowestScore": 70,
  "standardDeviation": 8.2
}
```

---

### 7. Get Course Average
**GET** `/api/grades/course/:courseId/average`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "courseId": "uuid",
  "courseName": "Mathematics",
  "average": 85.5,
  "totalGrades": 5
}
```

---

## Work Endpoints

### 1. Get All Works
**GET** `/api/works?courseId=optional&status=optional&startDate=optional&endDate=optional`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `courseId` (optional): Filter by course
- `status` (optional): Filter by status (PENDING, SUBMITTED, GRADED)
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "courseId": "uuid",
    "title": "Assignment 1",
    "description": "Complete homework",
    "status": "PENDING",
    "dueDate": "2026-02-28T23:59:59Z",
    "pointsEarned": 0,
    "pointsPossible": 20,
    "percentage": 0,
    "workTypeId": "uuid",
    "workTypeLabel": "TRAVAIL",
    "createdAt": "2026-02-24T10:00:00Z"
  }
]
```

---

### 2. Create Work
**POST** `/api/works`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "courseId": "uuid",
  "title": "Assignment 1",
  "description": "Complete homework",
  "dueDate": "2026-02-28T23:59:59Z",
  "pointsPossible": 20,
  "workTypeId": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "courseId": "uuid",
  "title": "Assignment 1",
  "status": "PENDING",
  "pointsPossible": 20,
  "pointsEarned": 0
}
```

---

### 3. Update Work
**PATCH** `/api/works/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "title": "Assignment 1 (Revised)",
  "status": "SUBMITTED",
  "pointsEarned": 18
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Assignment 1 (Revised)",
  "status": "SUBMITTED",
  "pointsEarned": 18,
  "percentage": 90
}
```

---

### 4. Delete Work
**DELETE** `/api/works/:id`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Work deleted successfully"
}
```

---

### 5. Recalculate Work Points
**POST** `/api/works/:id/recalculate-points`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "uuid",
  "pointsEarned": 18,
  "pointsPossible": 20,
  "percentage": 90
}
```

---

## Sync Endpoints

### 1. Push Changes
**POST** `/api/sync/push`

**Headers:**
```
Authorization: Bearer <accessToken>
X-Device-ID: device-uuid
```

**Request:**
```json
{
  "type": "CREATE",
  "entity": "Task",
  "data": {
    "id": "uuid",
    "title": "New task",
    "description": "Task description",
    "status": "PENDING",
    "priority": "HIGH",
    "dueDate": "2026-02-28T23:59:59Z",
    "courseId": "uuid",
    "eventId": null,
    "durationMinutes": 60,
    "timeSpentMinutes": 0,
    "position": 0,
    "startedAt": null,
    "completedAt": null,
    "syncStatus": "PENDING",
    "version": 1,
    "localId": "local-uuid"
  },
  "deviceId": "device-uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "New task",
    "status": "PENDING",
    "syncStatus": "SYNCED",
    "version": 1
  },
  "syncedAt": "2026-02-24T11:00:00Z"
}
```

---

### 2. Pull Changes
**GET** `/api/sync/pull?lastPulledAt=optional&deviceId=optional`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `lastPulledAt` (optional): ISO timestamp of last sync
- `deviceId` (optional): Device identifier

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Task 1",
      "status": "PENDING",
      "syncStatus": "SYNCED",
      "version": 1
    }
  ],
  "events": [
    {
      "id": "uuid",
      "title": "Event 1",
      "type": "EXAM",
      "status": "SYNCED"
    }
  ],
  "courses": [
    {
      "id": "uuid",
      "code": "MAT101",
      "name": "Mathematics"
    }
  ],
  "grades": [],
  "works": [],
  "syncedAt": "2026-02-24T11:00:00Z"
}
```

---

## Risk Analysis Endpoints

### 1. Get Course Risk Analysis
**GET** `/api/risk/course/:courseId`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "courseId": "uuid",
  "courseName": "Mathematics",
  "riskLevel": "HIGH",
  "score": 65,
  "factors": {
    "averageGrade": 70,
    "missedDeadlines": 2,
    "incompleteWorks": 3,
    "averageWorkTime": 45
  },
  "recommendations": [
    "Augmentez le temps d'étude",
    "Complétez les travaux en retard"
  ]
}
```

---

## Profile Endpoints

### 1. Get Profile
**GET** `/api/profile`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2026-02-24T10:00:00Z",
  "updatedAt": "2026-02-24T10:00:00Z"
}
```

---

### 2. Update Profile
**PUT** `/api/updateprofile`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "updatedAt": "2026-02-24T11:00:00Z"
}
```

---

## Health Check Endpoints

### 1. Health Status
**GET** `/api/health`

**Response (200):**
```json
{
  "status": "ok"
}
```

---

### 2. Server Status
**GET** `/`

**Response (200):**
```
Backend running
```

---

## Test Endpoints (Development Only)

### 1. Auth Test
**GET** `/api/test/auth-test`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Authentication successful",
  "userId": "uuid",
  "tokenPayload": {
    "userId": "uuid"
  }
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**
```json
{
  "error": "Validation failed"
}
```

**401 Unauthorized:**
```json
{
  "error": "Access token required" | "Token expired" | "Invalid token"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error message"
}
```

---

## Common Headers

All protected endpoints require:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
X-Device-ID: <device-uuid> (for sync endpoints)
```

---

## Status Codes

- **200 OK**: Successful GET, PATCH, DELETE
- **201 CREATED**: Successful POST
- **400 Bad Request**: Validation error
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: User not allowed to access resource
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error
