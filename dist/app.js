"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.globalLimiter = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const sync_routes_1 = __importDefault(require("./routes/sync.routes"));
const risk_routes_1 = __importDefault(require("./routes/risk.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const course_routes_1 = __importDefault(require("./routes/course.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const grade_routes_1 = __importDefault(require("./routes/grade.routes"));
const test_routes_1 = __importDefault(require("./routes/test.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const app = (0, express_1.default)();
const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Trop de requ�tes provenant de cette IP, veuillez r�essayer plus tard.'
});
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: 'Trop de tentatives de connexion provenant de cette IP, veuillez r�essayer plus tard.'
});
app.use(exports.globalLimiter);
app.use((0, cors_1.default)({
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, helmet_1.default)());
app.get("/", (_req, res) => {
    res.send("Backend running");
});
// Routes
app.get("/api/health", exports.globalLimiter, (_req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api/sync', exports.globalLimiter, sync_routes_1.default);
app.use('/api/auth', exports.authLimiter, auth_routes_1.default);
app.use('/api/courses', exports.globalLimiter, course_routes_1.default);
app.use('/api/tasks', exports.globalLimiter, task_routes_1.default);
app.use('/api/events', exports.globalLimiter, event_routes_1.default);
app.use('/api/grades', exports.globalLimiter, grade_routes_1.default);
app.use("/api/risk", exports.globalLimiter, risk_routes_1.default);
app.use("/api", exports.globalLimiter, profile_routes_1.default);
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/test', test_routes_1.default);
}
app.use(error_middleware_1.globalErrorHandler);
exports.default = app;
