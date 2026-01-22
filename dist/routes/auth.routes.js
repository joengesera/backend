"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.routes.ts
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const router = (0, express_1.Router)();
// Inscription : POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        await (0, AuthController_1.register)(req, res);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
        console.log(error);
    }
});
// Connexion : POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        await (0, AuthController_1.login)(req, res);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Refresh Token: POST /api/auth/refresh-token
router.post('/refresh-token', async (req, res) => {
    await (0, AuthController_1.RefreshToken)(req, res);
});
// Logout: POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        (0, AuthController_1.logout)(req, res);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Demande de reinitialisation
router.post('/forgot-password', async (req, res) => {
    try {
        (0, AuthController_1.forgotPassword)(req, res);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Reset Password: POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    try {
        (0, AuthController_1.ResetPassword)(req, res);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
