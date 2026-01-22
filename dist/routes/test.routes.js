"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/auth-test', auth_middleware_1.authenticateToken, (req, res) => {
    const user = req.user;
    res.json({
        success: true,
        message: 'Authentication successful',
        userId: user?.userId,
        tokenPayload: user
    });
});
exports.default = router;
