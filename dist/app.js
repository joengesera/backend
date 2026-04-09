"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = exports.globalLimiter = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const sync_routes_1 = __importDefault(require("./routes/sync.routes"));
const risk_routes_1 = __importDefault(require("./routes/risk.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const course_routes_1 = __importDefault(require("./routes/course.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const event_routes_1 = __importDefault(require("./routes/event.routes"));
const work_routes_1 = __importDefault(require("./routes/work.routes"));
const grade_routes_1 = __importDefault(require("./routes/grade.routes"));
const test_routes_1 = __importDefault(require("./routes/test.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const professor_routes_1 = __importDefault(require("./routes/professor.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const pino_http_1 = require("pino-http");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
app.use((0, pino_http_1.pinoHttp)({ logger: logger_1.logger }));
const allowedOrigins = (process.env.CORS_ORIGINS ||
    "http://localhost:5173,localhost:4173,http://localhost:3000,localhost:3000,https://rehnqfuoyxmbzrxoxroc.supabase.co,https://study-flow-ebon.vercel.app/")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === "OPTIONS",
    message: "Trop de requetes provenant de cette IP, veuillez reessayer plus tard."
});
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: "Trop de tentatives de connexion provenant de cette IP, veuillez reessayer plus tard."
});
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) {
            return callback(null, true);
        }
        // Check if origin is in allowed list or if * is allowed
        const isAllowed = allowedOrigins.includes("*") || allowedOrigins.includes(origin);
        if (isAllowed) {
            callback(null, true);
        }
        else {
            console.warn(`CORS rejected origin: ${origin}. Allowed: ${allowedOrigins.join(", ")}`);
            callback(new Error(`Origin not allowed by CORS: ${origin}`));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "X-Device-ID", "x-device-id"],
    exposedHeaders: ["Content-Length", "X-JSON-Response-Time"]
};
// IMPORTANT: CORS middleware must run early, before routes and limiters
app.use((0, cors_1.default)(corsOptions));
app.options(/.*/, (0, cors_1.default)(corsOptions));
app.use(exports.globalLimiter);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, helmet_1.default)());
//app.use(sanitizeInput);
app.get("/", (_req, res) => {
    res.send("Backend running");
});
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/api/sync", sync_routes_1.default);
app.use("/api/auth", exports.authLimiter, auth_routes_1.default);
app.use("/api/courses", exports.globalLimiter, course_routes_1.default);
app.use("/api/tasks", exports.globalLimiter, task_routes_1.default);
app.use("/api/events", exports.globalLimiter, event_routes_1.default);
app.use("/api/works", exports.globalLimiter, work_routes_1.default);
app.use("/api/grades", exports.globalLimiter, grade_routes_1.default);
app.use("/api/risk", exports.globalLimiter, risk_routes_1.default);
app.use("/api/professors", exports.globalLimiter, professor_routes_1.default);
app.use("/api", exports.globalLimiter, profile_routes_1.default);
if (process.env.NODE_ENV !== "production") {
    app.use("/api/test", test_routes_1.default);
}
app.use(error_middleware_1.globalErrorHandler);
exports.default = app;
