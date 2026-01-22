"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const globalErrorHandler = (err, req, res, next) => {
    console.error(`[Global Error] ${req.method} ${req.path}:`, err);
    if (res.headersSent) {
        return next(err);
    }
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        success: false,
        error: {
            message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
};
exports.globalErrorHandler = globalErrorHandler;
