import { Request, Response, NextFunction } from 'express';

/**
 * Basic XSS sanitization middleware.
 * It recursively cleans all string properties in the provided value.
 */
const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
        // Remove script tags and other potentially dangerous patterns
        return value
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
            .replace(/on\w+="[^"]*"/gim, '')
            .replace(/on\w+='[^']*'/gim, '')
            .replace(/javascript:/gim, '');
    }
    
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    
    if (value !== null && typeof value === 'object') {
        const sanitized: any = {};
        for (const key in value) {
            sanitized[key] = sanitizeValue(value[key]);
        }
        return sanitized;
    }
    
    return value;
};

/**
 * Middleware to sanitize request input (body, query, params).
 * Note: In some Express versions (like Express 5), req.query and req.params 
 * might be read-only getters. We use try-catch to safely handle these.
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        try {
            req.body = sanitizeValue(req.body);
        } catch (e) {
            // If body is read-only for some reason, we can't sanitize it this way
        }
    }
    
    // For query and params in Express 5, these are getters. 
    // We use Object.defineProperty to override them if they need sanitization.
    try {
        const sanitizedQuery = sanitizeValue(req.query);
        Object.defineProperty(req, 'query', {
            value: sanitizedQuery,
            writable: true,
            configurable: true,
            enumerable: true
        });
    } catch (e) {
        // Skip if we can't redefine
    }

    try {
        const sanitizedParams = sanitizeValue(req.params);
        Object.defineProperty(req, 'params', {
            value: sanitizedParams,
            writable: true,
            configurable: true,
            enumerable: true
        });
    } catch (e) {
        // Skip if we can't redefine
    }

    next();
};
