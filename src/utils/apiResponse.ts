import { Response } from 'express';

export interface ApiSuccess<T> {
    success: true;
    data: T;
}

export interface ApiError {
    success: false;
    error: {
        message: string;
        code?: string;
    };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export const sendSuccess = <T>(res: Response, data: T, status = 200): void => {
    res.status(status).json({ success: true, data } satisfies ApiSuccess<T>);
};

export const sendError = (
    res: Response,
    message: string,
    status = 500,
    code?: string
): void => {
    res.status(status).json({
        success: false,
        error: { message, ...(code ? { code } : {}) },
    } satisfies ApiError);
};