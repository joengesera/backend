"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // Must be first
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
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, helmet_1.default)());
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.use('/api/risk', risk_routes_1.default);
app.use('/api/sync', sync_routes_1.default);
app.use('/api/auth', auth_routes_1.default);
app.use('/api/courses', course_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
app.use('/api/events', event_routes_1.default);
app.use('/api/grades', grade_routes_1.default);
app.use('/api/test', test_routes_1.default);
app.use(error_middleware_1.globalErrorHandler);
exports.default = app;
