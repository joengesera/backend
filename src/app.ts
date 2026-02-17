import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import syncRoutes from "./routes/sync.routes";
import riskRoutes from "./routes/risk.routes";
import authRoutes from "./routes/auth.routes";
import courseRoutes from "./routes/course.routes";
import taskRoutes from "./routes/task.routes";
import eventRoutes from "./routes/event.routes";
import gradeRoutes from "./routes/grade.routes";
import testRoutes from "./routes/test.routes";
import profileRoutes from "./routes/profile.routes";
import { globalErrorHandler } from "./middlewares/error.middleware";
import rateLimit from "express-rate-limit";

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Trop de requ�tes provenant de cette IP, veuillez r�essayer plus tard.'
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: 'Trop de tentatives de connexion provenant de cette IP, veuillez r�essayer plus tard.'
});

app.use(globalLimiter);
app.use(cors({
    credentials: true,

}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.get("/", (_req, res) => {
    res.send("Backend running");
});
// Routes
app.get("/api/health", globalLimiter, (_req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api/sync', globalLimiter, syncRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/courses', globalLimiter, courseRoutes);
app.use('/api/tasks', globalLimiter, taskRoutes);
app.use('/api/events', globalLimiter, eventRoutes);
app.use('/api/grades', globalLimiter, gradeRoutes);
app.use("/api/risk", globalLimiter, riskRoutes);
app.use("/api", globalLimiter, profileRoutes);

if (process.env.NODE_ENV !== 'production') {
    app.use('/api/test', testRoutes);
}

app.use(globalErrorHandler);

export default app;
