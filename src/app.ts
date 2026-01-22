import "dotenv/config"; // Must be first
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
import { globalErrorHandler } from "./middlewares/error.middleware";
import rateLimit from "express-rate-limit";


const app = express();
export const globabalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Trop de requêtes provenant de cette IP, veuillez réessayer plus tard.'
})

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: true, // Only count failed requests toward the rate limit
    message: 'Trop de tentatives de connexion provenant de cette IP, veuillez réessayer plus tard.'
})

app.use(globabalLimiter);
app.use(cors({
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.get("/", (req, res) => {
    res.send("Hello i've finished my app! yeah!");
});

app.use('/api/risk', globabalLimiter, riskRoutes);
app.use('/api/sync', globabalLimiter, syncRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/courses', globabalLimiter, courseRoutes);
app.use('/api/tasks', globabalLimiter, taskRoutes);
app.use('/api/events', globabalLimiter, eventRoutes);
app.use('/api/grades', globabalLimiter, gradeRoutes);
app.use('/api/test', testRoutes);

app.use(globalErrorHandler);

export default app;
