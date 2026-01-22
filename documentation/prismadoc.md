#Pisma
## Definition
Prisma est un framework pour le developpement de base de données. Il perment entre autre de gerer les requetes sql de manière type safe.
---
Exemple de schema:
```prisma
model User {
  id    String @id @default(uuid())
  email String @unique
  name  String
  password String
  image String?
  courses Course[]
  todos Todo[]
  goals DailyGoal[]
}
```
```sql
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "courses" TEXT[],
    "todos" TEXT[],
    "goals" TEXT[]
);
```

## Utilisation
### Installation
Nous allons d'abord installer prisma et prisma-client.
```bash
npm install @prisma/client @prisma/client
```
__prisma__ sert de bridge entre le code et la base de données.
__prisma-client__ est un client pour interagir avec la base de données.






