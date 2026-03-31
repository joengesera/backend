import express from "express";
import cors from "cors";
import helmet from "helmet";
import syncRoutes from "./routes/sync.routes";
import riskRoutes from "./routes/risk.routes";
import authRoutes from "./routes/auth.routes";
import courseRoutes from "./routes/course.routes";
import taskRoutes from "./routes/task.routes";
import eventRoutes from "./routes/event.routes";
import workRoutes from "./routes/work.routes";
import gradeRoutes from "./routes/grade.routes";
import testRoutes from "./routes/test.routes";
import profileRoutes from "./routes/profile.routes";
import professorRoutes from "./routes/professor.routes";
import { globalErrorHandler } from "./middlewares/error.middleware";
import rateLimit from "express-rate-limit";
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger';

const app = express();

app.use(pinoHttp({ logger }));

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:3000,https://rehnqfuoyxmbzrxoxroc.supabase.co"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: "Trop de requetes provenant de cette IP, veuillez reessayer plus tard."
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: "Trop de tentatives de connexion provenant de cette IP, veuillez reessayer plus tard."
});

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list or if * is allowed
    const isAllowed = allowedOrigins.includes("*") || allowedOrigins.includes(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
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
app.use(cors(corsOptions));


app.options(/.*/, cors(corsOptions));

app.use(globalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
//app.use(sanitizeInput);

app.get("/", (_req, res) => {
  res.send("Backend running");
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/sync", syncRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/courses", globalLimiter, courseRoutes);
app.use("/api/tasks", globalLimiter, taskRoutes);
app.use("/api/events", globalLimiter, eventRoutes);
app.use("/api/works", globalLimiter, workRoutes);
app.use("/api/grades", globalLimiter, gradeRoutes);
app.use("/api/risk", globalLimiter, riskRoutes);
app.use("/api/professors", globalLimiter, professorRoutes);
app.use("/api", globalLimiter, profileRoutes);

if (process.env.NODE_ENV !== "production") {
  app.use("/api/test", testRoutes);
}

app.use(globalErrorHandler);

export default app;
