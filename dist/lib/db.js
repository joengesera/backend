"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// src/lib/db.ts
const client_1 = require("@prisma/client");
const prismaClientSingleton = () => {
    return new client_1.PrismaClient();
};
exports.db = global.prisma ?? prismaClientSingleton();
if (process.env.NODE_ENV !== 'production')
    global.prisma = exports.db;
