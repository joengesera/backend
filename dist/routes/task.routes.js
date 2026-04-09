"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TaskController = __importStar(require("../controllers/TaskController"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const task_validators_1 = require("../validators/task.validators");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Specific static routes first
router.get('/board', TaskController.getBoardTasks);
router.get('/focus/current', TaskController.getCurrentFocusTask);
router.post('/reorder', TaskController.reorderTasks);
// Specific parameterized routes
router.get('/event/:eventId', TaskController.getTasksByEvent);
router.post('/event/:eventId', TaskController.createTaskForEvent);
router.post('/:id/start', TaskController.startTask);
router.post('/:id/pause', TaskController.pauseTask);
router.post('/:id/complete', TaskController.completeTask);
// Generic routes last
router.get('/', TaskController.getTasks);
router.post('/', (0, validate_middleware_1.validate)({ body: task_validators_1.createTaskSchema }), TaskController.createTask);
router.patch('/:id', (0, validate_middleware_1.validate)({ body: task_validators_1.updateTaskSchema }), TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);
exports.default = router;
