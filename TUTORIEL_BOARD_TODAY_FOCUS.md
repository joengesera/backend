# Tutoriel Complet: Board + Today + Focus (meme application)

## Objectif
Ajouter a l'application existante, sans recreer un nouveau projet:

1. `Board` style Trello  
Colonnes = `Events`, cartes = `Tasks` liees a un event.
2. `Today`  
Vue filtree des events/taches du jour.
3. `Focus` style Blitzit  
Timer sur une tache avec duree limitee, pause/reprise, progression.

Le scope conserve les modules existants (`courses`, `schedule`, `grades`) et etend l'architecture actuelle.

---

## Phase 0: Preparation

1. Creer une branche:

```bash
git checkout -b feat/event-task-board-focus
```

2. Verifier que l'app tourne avant modifications:

```bash
pnpm install
pnpm dev
```

3. Snapshot de securite:

```bash
git status
git add -A
git commit -m "chore: snapshot before board-focus feature"
```

---

## Phase 1: Schema Prisma (Data Model)

### 1.1 Etendre `Task`
Ajouter dans `prisma/schema.prisma`:

- `eventId String?`
- `durationMinutes Int?`
- `timeSpentMinutes Int @default(0)`
- `position Int @default(0)`
- `startedAt DateTime?`

### 1.2 Ajouter `TaskSession`
Ajouter un nouveau modele:

- `id String @id @default(uuid())`
- `taskId String`
- `startedAt DateTime`
- `endedAt DateTime?`
- `durationSeconds Int @default(0)`
- `createdAt DateTime @default(now())`

Relation:

- `task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)`

### 1.3 Relation `Event` <-> `Task`

- Dans `Event`: `tasks Task[]`
- Dans `Task`: `event Event? @relation(fields: [eventId], references: [id], onDelete: SetNull)`

### 1.4 Index recommandes

- `@@index([userId, eventId])`
- `@@index([userId, status])`
- `@@index([eventId, position])`

### 1.5 Migration

```bash
pnpm prisma migrate dev --name add_event_task_board_focus
pnpm prisma generate
```

---

## Phase 2: Backend API (Express)

Etendre routes/controllers existants, ne pas creer un second backend.

### 2.1 Endpoints a ajouter

Dans `src/routes/task.routes.ts`:

1. `GET /api/tasks/board?from=...&to=...`
2. `GET /api/events/:eventId/tasks`
3. `POST /api/events/:eventId/tasks`
4. `PATCH /api/tasks/:id`
5. `POST /api/tasks/reorder`
6. `POST /api/tasks/:id/start`
7. `POST /api/tasks/:id/pause`
8. `POST /api/tasks/:id/complete`
9. `GET /api/tasks/focus/current`

### 2.2 Regles metier

1. Ownership strict (`userId`) sur events/tasks/sessions.
2. Une seule tache active simultanement par user.
3. `pause` et `complete` mettent a jour `timeSpentMinutes`.
4. Validation `durationMinutes > 0` si renseignee.
5. Reorder execute en transaction Prisma.

### 2.3 Smart defaults a la creation d'event

Dans `EventController.createEvent`, si `generateDefaultTasks === true`, creer:

1. `Preparer le plan de revision`
2. `Reviser les chapitres cles`
3. `Faire un entrainement`
4. `Relecture finale`

Avec durees par defaut (ex: 25/45/60 min) et `position` cohérente.

### 2.4 Validation

Valider:

- `status` (enum)
- `position` (int >= 0)
- `durationMinutes` (ex min 5, max 240)

---

## Phase 3: Sync + Mapping

### 3.1 Mapper backend/frontend

Dans les mappers, inclure:

- `eventId`
- `durationMinutes`
- `timeSpentMinutes`
- `position`
- `startedAt`

### 3.2 Sync push/pull

Dans le service de sync:

1. Push des tasks avec ces champs.
2. Pull + merge en preservant l'etat local.
3. Compat anciennes tasks:
   - `durationMinutes = null`
   - `timeSpentMinutes = 0`
   - `position = 0`
   - `eventId = null`

---

## Phase 4: Front Data Layer (Dexie/store)

### 4.1 Types

Etendre `Task` dans les types front:

- `eventId?: string`
- `durationMinutes?: number`
- `timeSpentMinutes?: number`
- `position?: number`
- `startedAt?: string`

Ajouter `TaskSession` si historisation locale necessaire.

### 4.2 Dexie migration

Nouvelle version DB avec indexes utilises par les vues:

- `tasks`: inclure `eventId`, `position`, `startedAt`
- `taskSessions` (optionnel)

Migration `upgrade` pour renseigner les valeurs par defaut.

---

## Phase 5: UI DaisyUI (minimal + responsive + coherent)

### 5.1 Layout

1. `drawer` pour la sidebar responsive.
2. `navbar` pour header global.
3. `dock` pour navigation mobile.
4. `tabs` pour `Board / Today / Focus / Schedule`.

### 5.2 Vue Board

Fichier suggere: `src/features/board/Board.tsx`

1. Colonnes = events.
2. Cartes = tasks liees.
3. Chaque carte affiche:
   - titre
   - priorite (`badge`)
   - duree
   - progression (`progress` ou `radial-progress`)
4. Drag & drop recommande:
   - `@dnd-kit/core`
   - `@dnd-kit/sortable`
5. Au drop:
   - update local `position`
   - call `POST /api/tasks/reorder`

### 5.3 Vue Today

Fichier suggere: `src/features/today/Today.tsx`

1. Events du jour.
2. Tasks du jour.
3. Tasks d'events proches (J+1/J+2) avec badges urgence.

### 5.4 Vue Focus

Fichier suggere: `src/features/focus/Focus.tsx`

1. Choisir une task.
2. `Start` => endpoint start.
3. Timer visuel:
   - `countdown`
   - `radial-progress`
4. `Pause` => endpoint pause.
5. `Complete` => endpoint complete.
6. Afficher `timeSpent / duration`.

---

## Phase 6: Smart Defaults UX

Dans le formulaire de creation d'event:

- Toggle: `Generer un plan de travail automatiquement`

Si active:

1. Front envoie `generateDefaultTasks: true`.
2. Backend cree les taches templates.
3. Board se rafraichit.

Option avancee: templates par type d'event (`EXAM`, `ASSIGNMENT`, `QUIZ`).

---

## Phase 7: Contrats API (payloads)

### 7.1 Creer task liee a event

```json
POST /api/events/:eventId/tasks
{
  "title": "Reviser chapitres 1-3",
  "description": "Focus sur les exercices",
  "priority": "HIGH",
  "durationMinutes": 45,
  "dueDate": "2026-02-20T18:00:00.000Z"
}
```

### 7.2 Reorder

```json
POST /api/tasks/reorder
{
  "items": [
    { "taskId": "uuid-1", "eventId": "event-1", "position": 0 },
    { "taskId": "uuid-2", "eventId": "event-1", "position": 1 }
  ]
}
```

### 7.3 Start focus

```json
POST /api/tasks/:id/start
{}
```

### 7.4 Pause focus (exemple reponse)

```json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "addedMinutes": 12,
    "timeSpentMinutes": 37
  }
}
```

---

## Phase 8: Tests minimum

### 8.1 Backend

1. Ownership checks sur tasks/events/sessions.
2. Start/pause/complete.
3. Reorder transactionnel.
4. Smart defaults generation.

### 8.2 Front

1. Board render colonnes/carte.
2. Drag drop => update local + call API.
3. Focus timer start/pause.
4. Responsive smoke test (mobile viewport).

---

## Phase 9: Rollout progressif

1. Feature flag: `ENABLE_BOARD_FOCUS`.
2. Deploy backend d'abord.
3. Deploy front ensuite.
4. Monitor routes `api/tasks/*`.

---

## Ordre d'implementation recommande

1. Prisma schema + migration.
2. Endpoints backend CRUD/reorder.
3. Endpoints focus session.
4. Smart defaults backend.
5. Mapper/sync.
6. Dexie migration.
7. UI Board.
8. UI Focus.
9. UI Today.
10. Tests + polish responsive.

---

## Pieges a eviter

1. Timer uniquement front sans persistance serveur.
2. Reorder sans transaction.
3. Oublier ownership (`userId`).
4. Conflits entre etat local et etat API sans strategie de merge.
5. Oublier le comportement offline pour start/pause.

---

## Plan de travail avec assistance

Tu peux me solliciter a chaque bloc:

1. `Etape A`: schema Prisma exact sur ton projet actuel.
2. `Etape B`: endpoints backend un par un.
3. `Etape C`: integration front DaisyUI composant par composant.
4. `Etape D`: tests et hardening.

Je te guiderai point par point avec les fichiers et commandes exactes.

