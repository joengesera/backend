"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_validators_1 = require("../validators/auth.validators");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    const parsed = auth_validators_1.registerSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    await (0, AuthController_1.register)(req, res);
});
router.post('/login', async (req, res) => {
    const parsed = auth_validators_1.loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    await (0, AuthController_1.login)(req, res);
});
router.post('/refresh-token', async (req, res) => {
    const parsed = auth_validators_1.refreshTokenSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    await (0, AuthController_1.RefreshToken)(req, res);
});
router.post('/logout', async (req, res) => {
    await (0, AuthController_1.logout)(req, res);
});
router.post('/forgot-password', async (req, res) => {
    const parsed = auth_validators_1.forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    await (0, AuthController_1.forgotPassword)(req, res);
});
router.post('/reset-password', async (req, res) => {
    const parsed = auth_validators_1.resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    await (0, AuthController_1.ResetPassword)(req, res);
});
exports.default = router;
