// ===============================================
// ⚠️ Centralized Error Handler
// ===============================================

import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    statusCode?: number;
    code?: number | string; // MongoDB error codes
    errors?: any;           // Validation errors
    keyValue?: any;         // MongoDB duplicate key values
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });

    const statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errorDetails: any = undefined;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🔍 MongoDB / Mongoose Error Handling
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Duplicate Key Error (E11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        return res.status(409).json({
            success: false,
            error: `Duplicate value entered for ${field}`,
            field,
        });
    }

    // Validation Error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors || {}).map((e: any) => e.message);
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: errors,
        });
    }

    // Cast Error (Invalid ID)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            error: 'Resource not found (invalid ID)',
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📤 Final Response
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        ...(errorDetails && { details: errorDetails }),
    });
}
