import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/validation.js';
import User, { IUser } from '../models/User.js';
import { config } from '../config/index.js';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

interface JwtPayload {
    id: string;
    role: string;
}



// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ Authenticate User
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get token from Cookie ONLY (Strict Same-Origin)
    const token = req.cookies?.auth_token;

    if (!token) {
        return next(new AppError('Not authorized to access this route', 401));
    }

    try {
        // 2. Verify token
        const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

        // 3. Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return next(
                new AppError('The user belonging to this token no longer exists.', 401)
            );
        }

        // 4. Check if user is active
        if (!currentUser.isActive) {
            return next(new AppError('User account is deactivated', 403));
        }

        // Grant access
        req.user = currentUser;
        next();
    } catch (error) {
        return next(new AppError('Not authorized to access this route', 401));
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👮 Role Guard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(
                new AppError(`User role ${req.user?.role} is not authorized to access this route`, 403)
            );
        }
        next();
    };
};
