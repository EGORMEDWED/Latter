import { Request, Response, NextFunction } from 'express';
import AuthService from '../database/services/AuthService';
import logger from '../utils/logger';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
    };
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Missing or invalid authorization header',
      });
      return;
    }

    const token = authHeader.substring(7);

    const result = AuthService.verifyAccessToken(token);

    if (!result.valid || !result.userId) {
      logger.warn('Invalid access token attempt');
      res.status(401).json({
        error: result.error || 'Invalid token',
      });
      return;
    }

    req.user = {
      userId: result.userId,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      error: 'Authentication failed',
    });
  }
};

export default authMiddleware;
