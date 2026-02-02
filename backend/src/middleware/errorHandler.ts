// ===============================================
// ⚠️ Error Handler Middleware
// ===============================================

import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
    statusCode?: number;
}

export const errorHandler = (
    err: ApiError,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    console.error('❌ Error:', err.message);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
