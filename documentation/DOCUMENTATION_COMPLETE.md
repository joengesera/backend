# 📚 Documentation Complète - Student Planner V2 Backend

**Dernière mise à jour :** 20 janvier 2026  
**Audience :** Développeurs Junior  
**Niveau de complexité :** Débutant à Intermédiaire

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture et structure](#architecture-et-structure)
3. [Guide des modules](#guide-des-modules)
4. [API - Endpoints détaillés](#api---endpoints-détaillés)
5. [Modèle de données](#modèle-de-données)
6. [Flux d'authentification](#flux-dauthentification)
7. [Concepts clés](#concepts-clés)
8. [Guide pas à pas pour débuter](#guide-pas-à-pas-pour-débuter)

---

## 🎯 Vue d'ensemble

### Qu'est-ce que c'est ?

**Student Planner V2** est une application backend pour aider les étudiants à gérer :
- 📚 Leurs **cours** (code, nom, description, crédits)
- ✅ Leurs **tâches** (à faire, en cours, terminées)
- 📅 Leurs **événements** (TD, TP, examens)
- 📊 Leurs **notes** (suivi des performances)
- ⚠️ Un **système de risque** (alerte si étudiant en difficulté)
- 🔄 Une **synchronisation** (offline-first, multi-appareils)

### Stack technologique

```
Backend:  Express.js + TypeScript
Database: PostgreSQL + Prisma ORM
Auth:     JWT (Access + Refresh tokens)
Utils:    Bcrypt, Nodemailer, Helmet, CORS
Testing:  Jest + Supertest
```

### Flux général

```
Client (Frontend)
    ↓
Authentication (JWT Token)
    ↓
Routes (GET/POST/PUT/DELETE)
    ↓
Controllers (Logique métier)
    ↓
Services (Logique applicative)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

---

## 🏗️ Architecture et structure

### Arborescence du projet

```
src/
├── app.ts                    # Configuration Express principale
├── index.ts                  # Point d'entrée de l'app
├── config/
│   └── jwt.config.ts        # Configuration JWT
├── controllers/              # Logique des requêtes HTTP
│   ├── AuthController.ts
│   ├── CourseController.ts
│   ├── TaskController.ts
│   ├── EventController.ts
│   ├── GradeController.ts
│   ├── RiskController.ts
│   └── SyncController.ts
├── services/                # Logique métier complète
│   ├── AuthServices.ts
│   ├── RiskService.ts
│   ├── emailService.ts
│   ├── GradeService.ts
│   └── ResetPasswordService.ts
├── routes/                  # Définition des endpoints
│   ├── auth.routes.ts
│   ├── course.routes.ts
│   ├── task.routes.ts
│   ├── event.routes.ts
│   ├── grade.routes.ts
│   ├── risk.routes.ts
│   ├── sync.routes.ts
│   └── test.routes.ts
├── middlewares/             # Logique intermédiaire
│   ├── auth.middleware.ts   # Vérification JWT
│   └── error.middleware.ts  # Gestion des erreurs
├── lib/
│   └── db.ts               # Instance Prisma
├── models/
│   ├── user.types.ts       # Types personnalisés
│   └── DATA.md             # Documentation data
└── utils/
    ├── bcrypt.utils.ts     # Hachage password
    └── jwt.utils.ts        # Génération tokens

prisma/
├── schema.prisma           # Schéma base de données
└── migrations/             # Historique migrations
```

### Responsabilités des couches

| Couche | Responsabilité | Exemple |
|--------|---|---|
| **Routes** | Mapper HTTP vers controllers | `POST /api/courses` → `createCourse` |
| **Controllers** | Récupérer données HTTP, appeler service | Extraire `userId` du token JWT |
| **Services** | Logique métier + accès DB | Calculer risque, valider données |
| **Middlewares** | Logique transversale | Vérifier JWT token |
| **Database** | Persistence des données | Prisma queries |

---

## 🧩 Guide des modules

### 1️⃣ Authentication (`AuthController` + `AuthServices`)

#### Responsabilité
Gérer inscription, connexion, tokens JWT et réinitialisation de mot de passe.

#### Classes/Fichiers clés
- **AuthServices.ts** : Logique d'auth (register, login, tokens)
- **AuthController.ts** : Endpoints HTTP
- **auth.middleware.ts** : Vérification JWT

#### Flux d'authentification complet
```
1. USER REGISTER
   POST /api/auth/register { email, name, password }
   ↓
   AuthService.register() → Hash password avec bcrypt
   ↓
   Crée utilisateur en DB
   ↓
   Retourne { user, tokens }

2. USER LOGIN
   POST /api/auth/login { email, password }
   ↓
   AuthService.login() → Compare password
   ↓
   Génère tokens JWT (15min access, 10j refresh)
   ↓
   Crée RefreshToken en DB
   ↓
   Retourne { user, tokens }

3. REQUEST PROTÉGÉE
   GET /api/courses avec "Authorization: Bearer <token>"
   ↓
   authenticateToken middleware
   ↓
   Vérifie signature JWT
   ↓
   Ajoute user au request : (req as any).user = { userId }
   ↓
   Controller reçoit userId protégé
```

#### Fonctions principales

```typescript
// Service
AuthService.register(email, name, password)
AuthService.login(email, password)
AuthService.generateTokens(userId)
AuthService.refreshToken(refreshToken)
AuthService.logout(refreshToken)
AuthService.forgotPassword(email)
AuthService.resetPassword(token, newPassword)

// Routes
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```
Check-list
 -  [] Comprendre toutes les fonctions
 -  [] Corriger les erreurs
 -  [] Implementer des nouvelles fonctionnalites
---

### 2️⃣ Courses (Cours)

#### Responsabilité
CRUD complet sur les cours d'un étudiant.

#### Flux CRUD
```
CREATE: POST /api/courses { code, name, description, color, credits }
        → db.course.create({ data, userId })

READ:   GET /api/courses
        → db.course.findMany({ where: { userId, isDeleted: false } })
        → Retourne array de courses

UPDATE: PUT /api/courses/:id { ...data }
        → Vérifier ownership (course.userId === req.user.userId)
        → db.course.update({ id, data })

DELETE: DELETE /api/courses/:id
        → Soft delete (isDeleted = true, deletedAt = now)
        → Hard delete possible en DB direct
```

#### Schéma Prisma
```prisma
model Course {
  id            String    @id @default(uuid())
  code          String    // Ex: "CS101"
  name          String    // Ex: "Intro to CS"
  description   String?
  color         String    @default("#3B82F6")  // Hex color
  credits       Int       @default(3)
  userId        String    // Ownership
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  isDeleted     Boolean   @default(false)      // Soft delete
  deletedAt     DateTime?
  
  // Relations
  user          User      @relation(fields: [userId], ...)
  events        Event[]   // Exams, TD, TP
  grades        Grade[]   // Notes de ce cours
  tasks         Task[]    // Devoirs liés
}
```

#### Exemple d'utilisation

```bash
# Créer un cours
curl -X POST http://localhost:3000/api/courses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "MATH101",
    "name": "Calcul Différentiel",
    "description": "Fondamentaux du calcul",
    "color": "#FF6B6B",
    "credits": 4
  }'

# Récupérer tous les cours
curl http://localhost:3000/api/courses \
  -H "Authorization: Bearer <token>"

# Mettre à jour un cours
curl -X PUT http://localhost:3000/api/courses/123 \
  -H "Authorization: Bearer <token>" \
  -d '{ "name": "Calcul Intégral" }'

# Supprimer un cours
curl -X DELETE http://localhost:3000/api/courses/123 \
  -H "Authorization: Bearer <token>"
```

---

### 3️⃣ Tasks (Tâches/Devoirs)

#### Responsabilité
Gestion des tâches à faire (devoirs, projets, révisions).

#### Statuts possibles
```
PENDING     → Pas encore commencée
IN_PROGRESS → En cours
COMPLETED   → Terminée
BLOCKED     → Bloquée
```

#### Priorités
```
LOW         → Pas urgent
MEDIUM      → Normal
HIGH        → Important
CRITICAL    → À faire rapidement
```

#### Schéma simplifié
```prisma
model Task {
  id            String
  title         String
  description   String?
  status        TaskStatus    // PENDING, IN_PROGRESS, etc.
  priority      TaskPriority
  dueDate       DateTime?     // Deadline
  completedAt   DateTime?     // Quand complétée
  courseId      String?       // Lié à quel cours (optionnel)
  userId        String        // Propriétaire
  
  // Sync fields (pour offline-first)
  syncStatus    SyncStatus    // SYNCED, PENDING
  lastModifiedAt DateTime     // Pour sync pull
  version       Int           // Pour versioning
  
  // Soft delete
  isDeleted     Boolean
  deletedAt     DateTime?
}
```

#### Endpoints
```
GET     /api/tasks                    # Toutes les tâches de l'user
POST    /api/tasks                    # Créer tâche
GET     /api/tasks/:id                # Détails
PUT     /api/tasks/:id                # Modifier
DELETE  /api/tasks/:id                # Supprimer (soft delete)
GET     /api/tasks/course/:courseId   # Tâches d'un cours
```

---

### 4️⃣ Events (Événements: TD, TP, Examens)

#### Responsabilité
Gestion des événements académiques (séances, examens, TP).

#### Types d'événements
```
EXAM        → Examen
LECTURE     → Cours magistral
LAB         → TP (Travaux Pratiques)
TUTORIAL    → TD (Travaux Dirigés)
ASSIGNMENT  → Travail en groupe
OTHER       → Autre
```

#### Schéma simplifié
```prisma
model Event {
  id          String
  title       String
  type        EventType      // EXAM, LECTURE, LAB, etc.
  description String?
  startDate   DateTime
  endDate     DateTime
  location    String?
  courseId    String
  userId      String
  
  // Pour sync
  lastModifiedAt DateTime
  syncStatus  SyncStatus
  
  // Hard delete (pas soft delete pour events)
  deletedAt   DateTime?
}
```

---

### 5️⃣ Grades (Notes)

#### Responsabilité
Suivi des notes/évaluations par cours.

#### Schéma
```prisma
model Grade {
  id          String
  score       Float         // Ex: 17.5
  maxScore    Float         // Ex: 20.0
  weight      Float?        // Poids dans moyenne (ex: 0.2 = 20%)
  feedback    String?       // Commentaires prof
  courseId    String
  userId      String
  createdAt   DateTime
  
  // Pour risk analysis
  lastModifiedAt DateTime
}
```

#### Endpoints
```
GET     /api/grades                   # Toutes les notes
POST    /api/grades                   # Ajouter note
GET     /api/grades/:id               # Détails
PUT     /api/grades/:id               # Modifier note
DELETE  /api/grades/:id               # Supprimer
```

---

### 6️⃣ Risk Analysis (Analyse de Risque) ⚠️

#### Responsabilité
**Calculer un score de risque** (0-100) pour chaque cours. Aide étudiant à savoir s'il est en danger.

#### Algorithme de calcul

```typescript
// Score final = moyenne pondérée de 3 facteurs

overallScore = 
  (performanceFactor * 0.4) +    // 40% : Performance académique
  (procrastinationFactor * 0.3) +  // 30% : Charge de travail
  (pressureFactor * 0.3)           // 30% : Urgence (examen proche)

// Résultat final
Level = LOW (0-30) | MEDIUM (30-60) | HIGH (60-85) | CRITICAL (85-100)
```

#### Les 3 facteurs en détail

**1. Performance Factor (Grades)**
```typescript
// Plus mauvaises notes = score élevé
average = (sum of (note/max)) / nombre_notes

performanceScore = max(0, (1 - average) * 100)

Exemples:
- 20/20 → 0%  (excellent)
- 10/20 → 50% (moyen)
- 5/20  → 75% (faible)
- Pas de notes → 40% (incertitude)
```

**2. Procrastination Factor (Tasks backlog)**
```typescript
// Plus de tâches en retard = score élevé
pending_tasks = nombre de tâches non COMPLETED

procrastinationScore = min(100, pending_tasks * 20)

Exemples:
- 0 tâches → 0%
- 2 tâches → 40%
- 5+ tâches → 100% (CRITICAL)
```

**3. Pressure Factor (Urgence examen)**
```typescript
// Examen très proche = score élevé
daysUntilExam = date(exam) - now()

if (daysUntilExam <= 2)   → 100%
if (daysUntilExam <= 7)   → 70%
if (daysUntilExam <= 14)  → 40%
else                       → 10%
```

#### Endpoint
```
GET /api/risk/course/:courseId
```

#### Réponse
```json
{
  "courseId": "uuid",
  "courseName": "Calcul Différentiel",
  "overallScore": 65,
  "level": "HIGH",
  "details": {
    "performance": 50,      // Mauvaises notes
    "procrastination": 80,  // Beaucoup de devoirs
    "pressure": 40          // Examen dans 10 jours
  }
}
```

---

### 7️⃣ Sync (Synchronisation Multi-appareils)

#### Responsabilité
Permettre offline-first : l'app mobile fonctionne sans internet, puis sync quand online.

#### Concept : "Last Write Wins"
```
Device 1                Device 2                Server
  (offline)              (offline)               (online)
    ↓                      ↓                        ↓
  Create Task A        Modify Task A          Both push
    ↓                      ↓                        ↓
  ────────────────→ SYNC PUSH ←────────────
                           ↓
                    Timestamp plus récente
                    gagne (Last Write)
```

#### Flux PUSH (Client → Server)
```
Client envoie:
POST /api/sync/push {
  type: "CREATE" | "UPDATE" | "DELETE"
  entity: "Task" | "Event" | "Course" | "Grade"
  data: { id, title, dueDate, ... }
  deviceId: "phone-uuid"
}

Server:
1. Crée ou remplace (upsert)
2. Met syncStatus = "SYNCED"
3. Met lastModifiedAt = now
4. Log dans SyncHistory
5. Retourne { success: true, syncedAt }
```

#### Flux PULL (Server → Client)
```
Client envoie:
GET /api/sync/pull?lastPulledAt=2025-01-19T10:00:00

Server:
1. Récupère tous items modifiés DEPUIS lastPulledAt
2. Retourne { tasks, events, grades, courses }
3. Log dans SyncHistory

Client reçoit et fusionne avec local DB
```

#### Schéma SyncHistory
```prisma
model SyncHistory {
  id           String
  userId       String
  deviceId     String      // phone-uuid, web-uuid
  syncType     SyncType    // PUSH, PULL
  status       String      // STARTED, COMPLETED, FAILED
  itemsPushed  Int?
  itemsPulled  Int?
  createdAt    DateTime
}
```

---

## 🔌 API - Endpoints détaillés

### Base URL
```
http://localhost:3000/api
```

### 🔐 Authentication Required ?
Les routes de **Courses, Tasks, Events, Grades, Risk, Sync** nécessitent un token JWT.

**Format :**
```
Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/json
```

---

### 📋 AUTH `/api/auth`

#### 1. Register
```
POST /register
Body: { email, name, password }
Response: 201 Created
{
  "message": "Utilisateur créé",
  "userId": "uuid"
}
```

#### 2. Login
```
POST /login
Body: { email, password }
Response: 200 OK
{
  "user": { id, email, name, createdAt, ... },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### 3. Refresh Token
```
POST /refresh-token
Body: { refreshToken: "..." }
Response: 200 OK
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

#### 4. Logout
```
POST /logout
Body: { refreshToken: "..." }
Response: 200 OK
{ "message": "Déconnexion réussie" }
```

#### 5. Forgot Password
```
POST /forgot-password
Body: { email: "user@example.com" }
Response: 200 OK
{
  "message": "Email de reinitialisation (simulé) envoyé",
  "devToken": "..." // À utiliser dans reset-password
}
```

#### 6. Reset Password
```
POST /reset-password
Body: { token: "...", newPassword: "..." }
Response: 200 OK
{ "message": "Mot de passe réinitialisé avec succès" }
```

---

### 📚 COURSES `/api/courses`

```
GET    /                    # Toutes les courses
POST   /                    # Créer une course
GET    /:id                 # Détails d'une course
PUT    /:id                 # Modifier une course
DELETE /:id                 # Supprimer une course
```

**Exemple POST :**
```json
POST /api/courses
{
  "code": "MATH101",
  "name": "Calcul Différentiel",
  "description": "Cours fondamental",
  "color": "#FF6B6B",
  "credits": 4
}
```

---

### ✅ TASKS `/api/tasks`

```
GET     /                           # Toutes les tâches
POST    /                           # Créer tâche
GET     /:id                        # Détails
PUT     /:id                        # Modifier
DELETE  /:id                        # Supprimer
GET     /course/:courseId           # Tâches d'un cours
```

**Exemple POST :**
```json
POST /api/tasks
{
  "title": "Devoir 1",
  "description": "Exercices 1-5",
  "status": "PENDING",
  "priority": "HIGH",
  "dueDate": "2025-02-15T23:59:59Z",
  "courseId": "uuid-du-cours"
}
```

---

### 📅 EVENTS `/api/events`

```
GET     /                           # Tous les événements
POST    /                           # Créer événement
GET     /:id                        # Détails
PUT     /:id                        # Modifier
DELETE  /:id                        # Supprimer
GET     /course/:courseId           # Événements d'un cours
```

**Exemple POST :**
```json
POST /api/events
{
  "title": "Examen Final",
  "type": "EXAM",
  "startDate": "2025-02-20T14:00:00Z",
  "endDate": "2025-02-20T16:00:00Z",
  "location": "Amphi A",
  "courseId": "uuid-du-cours"
}
```

---

### 📊 GRADES `/api/grades`

```
GET     /                           # Toutes les notes
POST    /                           # Ajouter note
GET     /:id                        # Détails
PUT     /:id                        # Modifier note
DELETE  /:id                        # Supprimer
```

**Exemple POST :**
```json
POST /api/grades
{
  "score": 17.5,
  "maxScore": 20,
  "weight": 0.3,
  "feedback": "Bon travail !",
  "courseId": "uuid-du-cours"
}
```

---

### ⚠️ RISK `/api/risk`

```
GET /course/:courseId       # Score de risque pour un cours
```

**Réponse :**
```json
{
  "courseId": "uuid",
  "courseName": "Calcul Différentiel",
  "overallScore": 65,
  "level": "HIGH",
  "details": {
    "performance": 50,
    "procrastination": 80,
    "pressure": 40
  }
}
```

---

### 🔄 SYNC `/api/sync`

```
POST /push              # Envoyer changements au serveur
GET  /pull              # Recevoir changements du serveur
```

**PUSH Example :**
```bash
POST /api/sync/push
{
  "type": "UPDATE",
  "entity": "Task",
  "data": {
    "id": "task-uuid",
    "title": "Devoir modifié",
    "status": "COMPLETED"
  },
  "deviceId": "phone-abc123"
}
```

**PULL Example :**
```bash
GET /api/sync/pull?lastPulledAt=2025-01-20T10:00:00Z&deviceId=phone-abc123
```

---

## 💾 Modèle de données

### Relations principales

```
User (1) ──→ (many) Course
        ├──→ (many) Task
        ├──→ (many) Event
        ├──→ (many) Grade
        └──→ (many) RefreshToken

Course (1) ──→ (many) Task
        ├──→ (many) Event
        └──→ (many) Grade

Task (1) ──→ (0..1) Course
Event (1) ──→ (1) Course
Grade (1) ──→ (1) Course
```

### User (Utilisateur)
```prisma
model User {
  id                     String
  email                  String      @unique
  name                   String
  passwordHash           String      // Hash bcrypt
  avatarUrl              String?
  language               String      @default("fr")
  timezone               String      @default("Europe/Paris")
  lastSyncedAt           DateTime?   // Dernière sync
  createdAt              DateTime
  updatedAt              DateTime
  
  // Password reset
  resetPasswordToken     String?
  resetPasswordExpiresAt DateTime?
  
  // Relations
  courses                Course[]
  events                 Event[]
  grades                 Grade[]
  tasks                  Task[]
  refreshTokens          RefreshToken[]
  syncHistories          SyncHistory[]
}
```

### RefreshToken (Tokens de rotation)
```prisma
model RefreshToken {
  id        String      @id @default(uuid())
  token     String      @unique
  userId    String      // Qui possède le token
  expiresAt DateTime    // Quand expire
  createdAt DateTime
  revokedAt DateTime?   // Si révoqué (logout)
}
```

---

## 🔐 Flux d'authentification

### Vue complète avec tokens

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    POST /api/auth/login
                  { email, password }
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
                    ▼                            ▼
        ┌─────────────────────┐    ┌──────────────────────┐
        │   AuthService.      │    │    Database          │
        │   login()           │───▶│  • Find user         │
        │                     │    │  • Compare password  │
        │ • Hash compare      │    │    (bcrypt)          │
        │ • Generate tokens   │    │                      │
        └─────────────────────┘    └──────────────────────┘
                    │
                    │ Create RefreshToken (10 days)
                    ▼
        ┌─────────────────────────────────────┐
        │ Response: 200 OK                    │
        │ {                                   │
        │   user: { id, email, name },        │
        │   tokens: {                         │
        │     accessToken:  "eyJh..." (15m)   │
        │     refreshToken: "eyJh..." (10d)   │
        │   }                                 │
        │ }                                   │
        └─────────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────────┐
        │  Client sauvegarde tokens           │
        │  • localStorage.accessToken         │
        │  • localStorage.refreshToken        │
        └─────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│              REQUÊTE PROTÉGÉE (GET /api/courses)                 │
└─────────────────────────────────────────────────────────────────┘
                                  │
        GET /api/courses avec Header:
        "Authorization: Bearer {accessToken}"
                                  │
                                  ▼
        ┌─────────────────────────────────┐
        │  authenticateToken middleware   │
        │  • Extrait token du header      │
        │  • Vérifie signature avec JWT   │
        │  • Decode payload               │
        │  • Ajoute user au req           │
        └─────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼ VALID                  ▼ INVALID
   continue                   401 Unauthorized


┌─────────────────────────────────────────────────────────────────┐
│              REFRESH TOKEN (15 min access expiré)                │
└─────────────────────────────────────────────────────────────────┘
                                  │
        POST /api/auth/refresh-token
        { refreshToken: "..." }
                                  │
                                  ▼
        ┌──────────────────────────────────────┐
        │  AuthService.refreshToken()          │
        │  • Vérifie refresh token valide      │
        │  • Check DB (not revoked)            │
        │  • Genère nouveau accessToken        │
        │  • Génère nouveau refreshToken       │
        │  • Delete ancien refreshToken de DB  │
        │  • Create nouveau en DB              │
        └──────────────────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────────┐
        │  Response: { accessToken, refreshToken }
        │  Client sauvegarde nouveaux tokens   │
        └──────────────────────────────────────┘
```

### Sécurité : Pourquoi 2 tokens ?

| Token | Durée | Utilisé | Risque |
|-------|-------|---------|--------|
| **Access** | 15 min | À chaque requête | Court = moins de dégâts si volé |
| **Refresh** | 10 jours | Générer nouveau access | Stocké sécurisé, rarement envoyé |

**Si access token volé** → Attaquant a 15 min max  
**Si refresh token volé** → Attaquant peut faire 10 jours de damage  

**Solution:** Refresh token en HTTP-only cookie (plus sûr)

---

## 💡 Concepts clés

### 1. Soft Delete vs Hard Delete

**Soft Delete (recommandé) :**
```typescript
// On marque comme supprimé, sans vraiment effacer
await db.course.update({
  where: { id },
  data: { 
    isDeleted: true,
    deletedAt: new Date()
  }
});

// Quand on fetch
where: { userId, isDeleted: false }  // Ignore deleted
```

**Avantages :**
- ✅ Peut récupérer les données
- ✅ Audit trail (qui a supprimé quand)
- ✅ Pas de risque de perte définitive

**Hard Delete :**
```typescript
await db.course.delete({ where: { id } });  // ⚠️ IRRÉVERSIBLE
```

---

### 2. JWT (JSON Web Token)

**Structure :**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
  .
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ
  .
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

= **Header . Payload . Signature**

**Payload contient :**
```json
{
  "userId": "abc123",
  "iat": 1516239022,        // Issued at
  "exp": 1516242622         // Expires at
}
```

**Vérification :** La signature garantit que personne n'a modifié le payload.

---

### 3. Bcrypt (Hachage password)

```typescript
// Enregistrement
const password = "MySecure123!";
const hash = await bcrypt.hash(password, 10);
// hash = "$2b$10$..." (impossible à décrypter)
await db.user.create({
  data: { passwordHash: hash }
});

// Login
const userInput = "MySecure123!";
const isValid = await bcrypt.compare(userInput, storedHash);
// compare() fait le travail
```

**Jamais stocker** passwords en clair !

---

### 4. Sync Status & Versioning

Pour multi-device sync sans conflit :

```prisma
model Task {
  syncStatus    SyncStatus  // SYNCED, PENDING
  lastModifiedAt DateTime   // Timestamp modification
  version       Int         // Version number
}
```

**Logique "Last Write Wins" :**
```
Device A modifie Task v1 → v2 (12:00)
Device B modifie Task v1 → v2 (12:01) ← Plus récent !

Au sync:
- Device A envoie v2 (12:00)
- Server voit Device B v2 (12:01) déjà là
- Garde Device B (timestamp plus récent)
```

---

### 5. Prisma & Relations

**Include (join)**
```typescript
const course = await db.course.findUnique({
  where: { id: "123" },
  include: {
    tasks: true,    // Récupère aussi les tasks
    events: true,   // et les events
    grades: true    // et les grades
  }
});
// course.tasks = [...]
// course.events = [...]
```

**Where avec nested**
```typescript
const tasks = await db.task.findMany({
  where: {
    course: {
      userId: "user123"  // Tasks du user via course
    }
  }
});
```

---

## 🚀 Guide pas à pas pour débuter

### Jour 1 : Comprendre l'architecture

**À faire :**
1. Lire ce document (3h)
2. Explorer le code :
   - [src/app.ts](src/app.ts) - Point d'entrée
   - [src/routes/](src/routes/) - Endpoints
   - [prisma/schema.prisma](prisma/schema.prisma) - Modèle DB
3. **Demander accès DB** (créer un compte test)

**Livrables :**
- [ ] Comprendre flux auth JWT
- [ ] Savoir différence entre soft/hard delete
- [ ] Pouvoir expliquer les 7 modules

---

### Jour 2 : Setup & Tests

**À faire :**
1. Cloner le repo et installer dépendances
   ```bash
   npm install
   ```

2. Configurer `.env` :
   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=super-secret
   JWT_REFRESH_SECRET=super-secret-2
   ```

3. Lancer migrations
   ```bash
   npm run generate    # Prisma client
   npm run migrate     # Appliquer migrations
   ```

4. Démarrer le serveur
   ```bash
   npm run dev
   ```

5. Tester endpoints avec **Postman** :
   - [x] POST /api/auth/register
   - [x] POST /api/auth/login
   - [x] GET /api/courses (sans token → 401)
   - [x] GET /api/courses (avec token → 200)

**Livrables :**
- [ ] App démarre sans erreur
- [ ] Tous les tests pass : `npm test`
- [ ] Fichier `.env` configuré

---

### Jour 3 : Modifier du code

**Exercice 1 : Ajouter un champ**

Ajouter un champ `instructor` à Course :

1. Éditer [prisma/schema.prisma](prisma/schema.prisma) :
   ```prisma
   model Course {
     ...
     instructor    String?     // Nouveau champ
   }
   ```

2. Créer migration :
   ```bash
   npm run migrate
   ```

3. Éditer [src/controllers/CourseController.ts](src/controllers/CourseController.ts) :
   ```typescript
   const { code, name, description, color, credits, instructor } = req.body;
   
   const course = await db.course.create({
     data: {
       userId,
       code,
       name,
       description,
       color,
       credits,
       instructor  // Ajouter ici
     }
   });
   ```

4. Tester : `POST /api/courses { ..., instructor: "Prof X" }`

---

**Exercice 2 : Créer un nouveau service**

Créer [src/services/NotificationService.ts](src/services/NotificationService.ts) :

```typescript
export class NotificationService {
  static async sendRiskAlert(userId: string, courseId: string, level: string) {
    // À implémenter : envoyer email si HIGH/CRITICAL
    console.log(`Alert: User ${userId} at RISK in ${courseId}`);
  }
}
```

Utiliser dans [src/controllers/RiskController.ts](src/controllers/RiskController.ts) :

```typescript
const analysis = await RiskService.analyzeCourse(courseId, userId);

if (analysis.level === 'HIGH' || analysis.level === 'CRITICAL') {
  await NotificationService.sendRiskAlert(userId, courseId, analysis.level);
}
```

---

### Jour 4 : Debugger

**Erreur : "Token invalide"**

1. Vérifier `.env` JWT_SECRET configuré
2. Vérifier Header : `Authorization: Bearer <token>`
3. Vérifier token pas expiré (console.log dans middleware)
4. Vérifier signature JWT

**Erreur : "Unauthorized"**

1. Vérifier token présent
2. Vérifier `(req as any).user?.userId` existe
3. Vérifier route protégée

**Debugging tips :**

```typescript
// Dans controller
console.log("User:", (req as any).user);      // Debug user
console.log("Body:", req.body);               // Debug input
console.log("Result:", result);               // Debug output

// Dans service
try {
  // code
} catch (e) {
  console.error("Erreur détail:", e);         // Voir l'erreur complète
  throw new Error(e.message);
}
```

---

### Jour 5 : Écrire tests

**Créer test simple :**

[tests/api.test.ts](tests/api.test.ts) :

```typescript
import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
  });

  it('should login with valid credentials', async () => {
    // Setup: create user
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test2@example.com', name: 'Test', password: 'pass' });
    
    // Test: login
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test2@example.com', password: 'pass' });
    
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
  });
});
```

Lancer : `npm test`

---

## 📚 Ressources complémentaires

**Prisma :**
- https://www.prisma.io/docs/
- Docs français : https://www.prisma.io/docs/getting-started/quickstart

**JWT :**
- https://jwt.io/

**Express.js :**
- https://expressjs.com/

**TypeScript :**
- https://www.typescriptlang.org/docs/

---

## 🆘 Questions fréquentes

**Q: Comment ajouter une migration DB ?**  
A: Éditer [prisma/schema.prisma](prisma/schema.prisma), puis `npm run migrate --name description`

**Q: Pourquoi j'obtiens "401 Unauthorized" ?**  
A: Vous n'avez pas envoyé le JWT token. Ajouter le header : `Authorization: Bearer <token>`

**Q: Comment tester sans frontend ?**  
A: Utiliser Postman, Insomnia, ou `curl` dans le terminal

**Q: Comment déboguer une requête ?**  
A: Ajouter `console.log()` dans le controller/service et vérifier les logs du serveur

**Q: Comment modifier un utilisateur existant ?**  
A: PUT /api/users/:id (route non encore créée, à faire !)

---

## ✅ Checklist démarrage

- [ ] J'ai lu cette doc complètement
- [ ] J'ai setup la DB et `.env`
- [ ] `npm run dev` fonctionne sans erreur
- [ ] Je peux register/login avec Postman
- [ ] Je comprends le flux JWT
- [ ] Je peux modifier un fichier sans casser l'app
- [ ] J'ai compris le modèle de données
- [ ] Je sais expliquer les 7 modules

---

## 🎯 Prochaines étapes

1. **Implémenter** manque : routes GET/PUT/DELETE users
2. **Améliorer** validation avec Zod
3. **Ajouter** email notifications (reset, risk alert)
4. **Tester** synchronisation multi-device
5. **Déployer** sur Azure/Heroku

---

**Bonne chance ! 🚀**

*Mis à jour : 20 janvier 2026*
