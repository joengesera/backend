Voici le tutoriel complet au format **Markdown** (code brut), prêt à être copié dans un fichier `README.md` ou dans ton rapport de mémoire.

```markdown
# 🎓 Guide d'Initialisation : Prisma 7 (Standard SaaS)

Ce guide détaille la mise en place de **Prisma 7**, l'outil de gestion de base de données (ORM) le plus moderne pour Node.js et TypeScript.

---

## 1. Comprendre Prisma
Prisma est un **ORM** (*Object-Relational Mapper*). Il sert de traducteur entre ton code TypeScript et ta base de données SQL (PostgreSQL).

### Les 4 Piliers du fonctionnement :
1.  **Le Schéma (`schema.prisma`)** : La définition de tes tables et relations en langage clair.
2.  **La Configuration (`prisma.config.ts`)** : (Nouveau en v7) Le fichier qui gère la connexion sécurisée pour les outils de développement.
3.  **Le Client (`PrismaClient`)** : Une bibliothèque générée automatiquement qui te permet de manipuler tes données avec auto-complétion.
4.  **Le Studio** : Une interface web pour visualiser et modifier tes données comme dans Excel.

---

## 2. Installation et Configuration

### Étape 1 : Installation des dépendances
Dans ton dossier backend, installe les paquets nécessaires :
```bash
# Dépendances de production
npm install @prisma/client

# Dépendances de développement
npm install -D prisma @prisma/config dotenv
```

### Étape 2 : Le fichier d'environnement (`.env`)
Crée un fichier `.env` à la racine de ton backend. C'est ici que repose ton lien secret vers ta base de données (ex: Neon.tech).
```env
DATABASE_URL="postgresql://user:password@hostname/dbname?sslmode=require"
```

### Étape 3 : Le fichier de Configuration (Obligatoire en v7)
Crée un fichier `prisma.config.ts` à la racine de ton dossier `/backend`. Ce fichier permet à Prisma 7 de lire ton URL pour les migrations.
```typescript
import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

### Étape 4 : Le Schéma Prisma (`prisma/schema.prisma`)
C'est ici que tu définis tes modèles. 
**Attention :** En Prisma 7, si tu utilises un fichier de config TS, tu ne dois **pas** mettre la ligne `url` dans le bloc `datasource`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // L'URL est gérée par le fichier prisma.config.ts
}

model User {
  id    String @id @default(uuid())
  email String @unique
  name  String
}
```

---

## 3. Gestion du TypeScript (`tsconfig.json`)

Pour éviter que TypeScript ne génère une erreur car `prisma.config.ts` se trouve en dehors de ton dossier `/src`, modifie ton `tsconfig.json` :

```json
{
  "compilerOptions": {
    // ... tes options
    "rootDir": "./src",
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "prisma.config.ts"]
}
```

---

## 4. Workflow et Commandes Utiles

### Synchroniser la base de données (Migration)
À chaque fois que tu modifies ton schéma, lance cette commande pour mettre à jour la base de données réelle :
```bash
npx prisma migrate dev --name nom_de_ma_modif
```

### Visualiser les données
Pour ouvrir l'interface de gestion de données :
```bash
npx prisma studio
```

---

## 5. Bonnes Pratiques : Le Singleton DB

Pour éviter d'ouvrir trop de connexions à la base de données, utilise un "Singleton" dans ton code. Crée un fichier `src/lib/db.ts` :

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

### Pourquoi ce choix technique ?
1. **Sécurité** : L'URL est isolée dans un fichier de config Typé.
2. **Productivité** : L'auto-complétion empêche 99% des erreurs de requêtes.
3. **Évolutivité** : Changer de base de données se fait en modifiant une seule ligne.
```
```