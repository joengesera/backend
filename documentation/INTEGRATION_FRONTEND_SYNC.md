# 🔄 Guide Complet : Intégration Frontend - Synchronisation Backend

**Date :** 21 janvier 2026  
**Pour :** Développeurs Frontend/Backend  
**Audience :** Tous niveaux

---

## 📊 État actuel du Frontend

Le frontend **frontendV3** dispose déjà d'une infrastructure de synchronisation partielle. Voici ce qui existe:

### ✅ Ce qui fonctionne

```
Frontend Setup:
├── Dexie (IndexedDB)           ✅ Stockage local offline
├── Axios interceptor            ✅ Gestion JWT automatique
├── useSync hook                 ✅ Logique PUSH/PULL
├── Stores (Zustand)             ✅ Gestion état auth
└── DB types                     ✅ Structure définie
```

### ⚠️ Ce qui nécessite corrections

```
Problèmes identifiés:
├── PUSH endpoint: Envoie format incorrect
├── PULL endpoint: Pas de gestion userId
├── Sync Status: Confusion PENDING vs LOCAL
├── Conflict resolution: Non implémentée
└── Error handling: Basique
```

---

## 🏗️ Architecture Synchronisation

### Vue d'ensemble (Client-Server)

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Vue.tsx)                       │
│  • Create/Update/Delete (tasks, courses, events, grades)    │
│  • Store localement avec syncStatus = 'PENDING'             │
│  • Affiche UI immédiatement (optimistic UI)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
          useSync hook (3s interval)
                     │
                     ▼
    ┌──────────────────────────────────┐
    │  1. PUSH (Upload changes)        │
    │  POST /api/sync/push             │
    │  { type, entity, data }          │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  Backend SyncController           │
    │  • Valide ownership (JWT)        │
    │  • Upsert en DB                  │
    │  • Retourne success              │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  2. PULL (Download changes)      │
    │  GET /api/sync/pull?lastPulledAt │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │  Backend returns                 │
    │  {                               │
    │    tasks: [...],                │
    │    events: [...],               │
    │    courses: [...],              │
    │    grades: [...]                │
    │  }                               │
    └────────────┬─────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend: Merge dans IndexedDB (bulkPut)                   │
│  Mark as syncStatus = 'SYNCED'                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Intégration Détaillée

### A. Configuration Backend (DÉJÀ PRÊTE ✅)

#### Endpoints existants

```typescript
// Routes: src/routes/sync.routes.ts
POST /api/sync/push   ← PUSH endpoint (protégé par JWT)
GET  /api/sync/pull   ← PULL endpoint (protégé par JWT)

// Middleware: auth.middleware.ts
→ Vérifie JWT token
→ Ajoute (req as any).user = { userId }
```

#### Contrôleur SyncController

**PUSH (src/controllers/SyncController.ts)**
```typescript
export const handleSyncPush = async (req: Request, res: Response) => {
    const { type, entity, data } = req.body;
    const safeUserId = (req as any).user?.userId;  // Du token JWT
    
    if (!safeUserId) return res.status(401).json({ error: "Unauthorized" });
    
    // Upsert logic
    if (type === 'CREATE' || type === 'UPDATE') {
        await model.upsert({
            where: { id: data.id },
            update: payload,
            create: payload
        });
    }
    // Soft delete
    else if (type === 'DELETE') {
        await model.update({
            where: { id: data.id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
    }
    
    res.status(200).json({ success: true, syncedAt: new Date() });
}
```

**PULL (récupère modifications depuis lastPulledAt)**
```typescript
export const handleSyncPull = async (req: Request, res: Response) => {
    const safeUserId = (req as any).user?.userId;
    const { lastPulledAt } = req.query;
    
    const since = new Date(String(lastPulledAt)) || new Date(0);
    
    // Récupère tous les items modifiés depuis cette date
    const tasks = await db.task.findMany({
        where: {
            userId: safeUserId,
            lastModifiedAt: { gt: since }
        }
    });
    // + events, grades, courses...
    
    res.json({ tasks, events, grades, courses });
}
```

---

### B. Configuration Frontend (À CORRIGER)

#### 1️⃣ Structure Dexie (OK, mais à affiner)

**Fichier: `src/db/db.ts`**
```typescript
export class StudentDB extends Dexie {
    tasks!: Table<Task>;
    events!: Table<Event>;
    courses!: Table<Course>;
    grades!: Table<Grade>;
    syncState!: Table<SyncState>;
    
    constructor() {
        super('StudentPlannerDB');
        this.version(1).stores({
            tasks: '++id, localId, status, dueDate, syncStatus, courseId',
            events: '++id, localId, startDate, type, syncStatus, courseId',
            courses: '++id, localId, code, syncStatus',
            grades: '++id, localId, courseId, syncStatus',
            syncState: '++id'
        });
    }
}

export const db = new StudentDB();
```

**Ce qu'il faut ajouter :**
```typescript
// Indices importants
// syncStatus: pour filtrer PENDING pendant PUSH
// localId: identifiant unique côté client
// courseId: pour relationner les données
```

#### 2️⃣ Axios Interceptor (À CORRIGER ⚠️)

**Fichier: `src/lib/axios.ts`** - PROBLÈME ACTUEL
```typescript
export const api = axios.create({
  baseURL: 'http://localhost:3000',  // OK
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;  // ✅ BON
  }
  
  return config;
});
```

**✅ C'est déjà correct!** Aucune change nécessaire.

#### 3️⃣ useSync Hook (À CORRIGER ⚠️)

**Fichier: `src/hooks/useSync.ts`** - NOMBREUX PROBLÈMES

##### Problème 1: PUSH envoie format incorrect

❌ **Actuel (mauvais):**
```typescript
const changes: Record<string, BaseEntity[]> = {};
// ...
await api.post('/api/sync/push', changes);  // Envoie tout d'un coup!
```

✅ **À faire (correct):**
```typescript
// Envoyer item par item
for (const tableName of tables) {
  const pending = await table.where('syncStatus').equals('PENDING').toArray();
  
  for (const item of pending) {
    await api.post('/api/sync/push', {
      type: item.id ? 'UPDATE' : 'CREATE',
      entity: tableName.charAt(0).toUpperCase() + tableName.slice(1, -1), // 'Task', 'Event'
      data: {
        id: item.localId,        // UUID du client
        title: item.title,
        status: item.status,
        // ... autres champs
      }
    });
  }
}
```

##### Problème 2: PULL ne parse pas bien la réponse

❌ **Actuel:**
```typescript
const response = await api.get('/api/sync/pull', { params: { lastPulledAt } });
const remoteChanges = response.data;  // OK mais...
```

✅ **À corriger:**
```typescript
const response = await api.get('/api/sync/pull', { 
  params: { 
    lastPulledAt,
    deviceId: 'frontend-' + navigator.userAgent.substring(0, 30)
  } 
});

const { tasks, events, grades, courses } = response.data;

// Puis fusionner chacun
if (tasks && tasks.length > 0) {
  await db.tasks.bulkPut(tasks);
}
```

##### Problème 3: Sync Status confusion

**Types à respecter:**
```typescript
type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

// Quand créer offline:
{ ...item, syncStatus: 'PENDING', localId: generateUUID() }

// Après PUSH réussi:
{ ...item, syncStatus: 'SYNCED' }

// Si PUSH échoue:
{ ...item, syncStatus: 'FAILED' }
```

---

## 🛠️ Code à Implémenter (Correctifs Frontend)

### Fichier 1: `src/hooks/useSync.ts` (RÉWRITE)

```typescript
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { db } from '../db/db';
import { api } from '../lib/axios';
import type { Table } from 'dexie';
import type { BaseEntity, Task, Event, Course, Grade } from '../db/types';
import { v4 as uuidv4 } from 'uuid';

const SYNC_INTERVAL = 10000; // 10 secondes (au lieu de 3)
const MAX_RETRY_ATTEMPTS = 3;

interface SyncStats {
  pushed: number;
  pulled: number;
  failed: number;
}

export function useSync() {
  const { isAuthenticated } = useAuthStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats>({ pushed: 0, pulled: 0, failed: 0 });
  
  const syncAvailable = useRef(true);
  const retryCount = useRef(0);

  // 📡 PUSH: Envoyer les changements locaux au serveur
  const pushChanges = async (): Promise<number> => {
    if (!navigator.onLine || !syncAvailable.current) return 0;
    
    let pushedCount = 0;

    try {
      const tablesToSync: Array<[string, Table<any>]> = [
        ['tasks', db.tasks],
        ['events', db.events],
        ['courses', db.courses],
        ['grades', db.grades],
      ];

      for (const [tableName, table] of tablesToSync) {
        // Récupère les items PENDING
        const pending = await table.where('syncStatus').equals('PENDING').toArray();

        for (const item of pending) {
          try {
            // Détermine le type d'opération
            const hasServerId = item.serverId || item.id > 1000; // ID > 1000 = depuis serveur
            const operationType = hasServerId ? 'UPDATE' : 'CREATE';

            // Mappe le nom de la table au nom d'entité
            const entityMap: Record<string, string> = {
              'tasks': 'Task',
              'events': 'Event',
              'courses': 'Course',
              'grades': 'Grade',
            };

            const response = await api.post('/api/sync/push', {
              type: operationType,
              entity: entityMap[tableName] || tableName,
              data: {
                id: item.localId,  // UUID du client
                title: item.title || item.name,
                description: item.description,
                status: item.status,
                priority: item.priority,
                dueDate: item.dueDate,
                courseId: item.courseId,
                code: item.code,
                name: item.name,
                color: item.color,
                credits: item.credits,
                // ... autres champs spécifiques
              },
            });

            if (response.data.success) {
              // Marquer comme SYNCED
              await table.update(item.id, { 
                syncStatus: 'SYNCED',
                serverId: response.data.serverId, // Sauvegarder ID serveur
              });
              pushedCount++;
              console.log(`✅ Pushed: ${tableName} - ${item.title || item.name}`);
            }
          } catch (error: any) {
            console.error(`❌ Failed to push ${tableName}:`, error);
            // Marquer comme FAILED
            await table.update(item.id, { syncStatus: 'FAILED' });
          }
        }
      }

      retryCount.current = 0;
      setSyncError(null);
      return pushedCount;
    } catch (error: any) {
      console.error('Push batch error:', error);
      retryCount.current++;
      
      if (error?.response?.status === 401) {
        setSyncError('Session expired - please login again');
        useAuthStore.getState().logout();
        return 0;
      }

      if (retryCount.current >= MAX_RETRY_ATTEMPTS) {
        syncAvailable.current = false;
        setSyncError('Sync failed - will retry when online');
      }
      
      return 0;
    }
  };

  // 📥 PULL: Télécharger les changements du serveur
  const pullChanges = async (): Promise<number> => {
    if (!navigator.onLine || !syncAvailable.current) return 0;

    let pulledCount = 0;

    try {
      // Récupère la dernière date de sync
      const syncState = await db.syncState.get(1);
      const lastPulledAt = syncState?.lastPulledAt || new Date(0).toISOString();

      const response = await api.get('/api/sync/pull', {
        params: {
          lastPulledAt,
          deviceId: `web-${Math.random().toString(36).substr(2, 9)}`,
        },
      });

      const { tasks, events, courses, grades } = response.data;

      // Fusionne les données avec bulkPut (upsert)
      if (tasks && tasks.length > 0) {
        const syncedTasks = tasks.map(t => ({ ...t, syncStatus: 'SYNCED' }));
        await db.tasks.bulkPut(syncedTasks);
        pulledCount += tasks.length;
        console.log(`✅ Pulled ${tasks.length} tasks`);
      }

      if (events && events.length > 0) {
        const syncedEvents = events.map(e => ({ ...e, syncStatus: 'SYNCED' }));
        await db.events.bulkPut(syncedEvents);
        pulledCount += events.length;
        console.log(`✅ Pulled ${events.length} events`);
      }

      if (courses && courses.length > 0) {
        const syncedCourses = courses.map(c => ({ ...c, syncStatus: 'SYNCED' }));
        await db.courses.bulkPut(syncedCourses);
        pulledCount += courses.length;
        console.log(`✅ Pulled ${courses.length} courses`);
      }

      if (grades && grades.length > 0) {
        const syncedGrades = grades.map(g => ({ ...g, syncStatus: 'SYNCED' }));
        await db.grades.bulkPut(syncedGrades);
        pulledCount += grades.length;
        console.log(`✅ Pulled ${grades.length} grades`);
      }

      // Met à jour la date de sync
      await db.syncState.put({ id: 1, lastPulledAt: new Date().toISOString() });

      retryCount.current = 0;
      setSyncError(null);
      return pulledCount;
    } catch (error: any) {
      console.error('Pull error:', error);
      retryCount.current++;

      if (error?.response?.status === 401) {
        setSyncError('Session expired');
        useAuthStore.getState().logout();
        return 0;
      }

      if (retryCount.current >= MAX_RETRY_ATTEMPTS) {
        syncAvailable.current = false;
      }

      return 0;
    }
  };

  // 🔄 Sync complet: PUSH puis PULL
  const syncAll = async () => {
    if (isSyncing) return;
    if (!isAuthenticated || !navigator.onLine) return;

    setIsSyncing(true);
    try {
      const pushed = await pushChanges();
      const pulled = await pullChanges();
      
      setSyncStats({ pushed, pulled, failed: 0 });
    } finally {
      setIsSyncing(false);
    }
  };

  // 👂 Event listeners: Online/Offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Online detected');
      setIsOnline(true);
      syncAvailable.current = true;
      retryCount.current = 0;
      syncAll();
    };

    const handleOffline = () => {
      console.log('📴 Offline detected');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ⏱️ Interval sync quand online et authentifié
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial sync après 2 secondes
    const initialSyncTimer = setTimeout(() => {
      syncAll();
    }, 2000);

    // Sync régulier
    const syncInterval = setInterval(() => {
      syncAll();
    }, SYNC_INTERVAL);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(syncInterval);
    };
  }, [isAuthenticated]);

  return {
    isOnline,
    isSyncing,
    syncError,
    syncStats,
    syncNow: syncAll, // Pour forcer un sync manuel
  };
}
```

---

## 📝 Steps pour implémenter

### Phase 1: Setup (Jour 1)

- [ ] Vérifier que `axios.ts` a l'interceptor JWT ✅ (déjà bon)
- [ ] Installer `uuid`: `npm install uuid`
- [ ] Mettre à jour `useSync.ts` avec le code ci-dessus
- [ ] Vérifier que les types Dexie matchent le backend

### Phase 2: Test (Jour 2)

- [ ] Créer une tâche en offline
- [ ] Vérifier qu'elle a `syncStatus: 'PENDING'`
- [ ] Aller online
- [ ] Vérifier que PUSH se déclenche
- [ ] Vérifier dans `npm run dev` backend que PUSH arrive
- [ ] Vérifier que tâche passe à `SYNCED`

### Phase 3: Gestion d'erreurs (Jour 3)

- [ ] Tester déconnexion JWT (403)
- [ ] Tester réseau faible (timeouts)
- [ ] Tester création de 100 items + sync

---

## 🧪 Checklist de test

### Test 1: PUSH d'une nouvelle tâche

```
1. App offline
2. Créer Task "Test Sync"
3. Vérifier syncStatus = PENDING dans DevTools (IndexedDB)
4. Aller online
5. ✅ PUSH devrait s'envoyer (voir logs browser)
6. ✅ Backend reçoit: POST /api/sync/push
7. ✅ Task sauvegardée en DB
8. ✅ Frontend marque syncStatus = SYNCED
```

### Test 2: PULL depuis autre device

```
1. Device A: Créer Course "Math"
2. Device B: App fermée
3. Device A: Sync (PUSH)
4. Device B: Ouvrir app
5. ✅ PULL se déclenche
6. ✅ Course "Math" apparaît
```

### Test 3: Conflit (Last Write Wins)

```
1. Device A: Créer Grade (score: 15)
2. Device B: Créer Grade même ID (score: 18)
3. Device A sync
4. Device B sync
5. ✅ Score = 18 (Device B win, timestamp plus récent)
```

---

## 🐛 Debugging

### Logs à voir

```
// Browser Console
🔍 Axios Interceptor:
  - Request URL: /api/sync/push
  - Token present: true
  - Authorization header set ✔

// Browser IndexedDB
→ Tasks table: syncStatus column
  • 3 items: 2 SYNCED, 1 PENDING

// Backend logs (npm run dev)
✅ Token verified successfully for user: abc123
```

### Erreurs courantes

| Erreur | Cause | Fix |
|--------|-------|-----|
| 401 Unauthorized | Token expiré | Implémenter refresh-token |
| 403 Forbidden | userId mismatch | Ne pas envoyer userId dans body |
| 404 Not Found | Endpoint inexistant | Vérifier `/api/sync/push` existe |
| Rien ne sync | App offline | Vérifier `navigator.onLine` |
| Sync boucle infinie | Erreur dans pullChanges | Ajouter try/catch |

---

## 🚀 Prochaines améliorations

1. **Conflict Resolution**: Implémenter merge strategy au lieu de "Last Write Wins"
2. **Optimistic Updates**: Afficher changes immédiatement sans attendre PUSH
3. **Compression**: Compresser data pour PUSH (gzip)
4. **Queuing**: Persister queue de PUSH si erreur
5. **Diff Tracking**: Envoyer seulement les champs modifiés

---

## 📚 Ressources

- [Dexie Documentation](https://dexie.org/)
- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [IndexedDB MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Offline-first Patterns](https://www.shopify.com/partners/blog/offline-first)

---

## ✅ Validation Finale

Après implementation, vérifier:

```typescript
// Frontend prêt when:
✓ useSync hook implémenté
✓ PUSH envoie item par item
✓ PULL reçoit et merge
✓ SyncStatus bien géré
✓ JWT token dans Authorization header
✓ Tests passent (offline → online → sync)
✓ Logs clairs dans console

// Backend prêt when:
✓ POST /api/sync/push reçoit data
✓ GET /api/sync/pull retourne { tasks, events, courses, grades }
✓ JWT middleware appliqué
✓ Tests: npm test passe 7/7
✓ Pas de 500 errors
✓ Logs clairs dans npm run dev
```

---

**Questions? Voir DOCUMENTATION_COMPLETE.md pour plus de détails sur chaque endpoint.**
