import { Router, Request, Response } from 'express';
import {
  getConnectionState,
  getRedisConnectionState,
  isRedisHealthy,
} from '../database';

const router = Router();

/**
 * @route GET /api/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/', async (_req: Request, res: Response) => {
  const dbState = getConnectionState();
  const redisState = getRedisConnectionState();
  const redisHealthy = await isRedisHealthy().catch(() => false);

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Lettera Server is healthy!',
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbState.readyState === 1,
      host: dbState.host,
      port: dbState.port,
      name: dbState.name,
      readyState: dbState.readyState,
    },
    redis: {
      connected: redisHealthy,
      status: redisState.status,
      host: redisState.host,
      port: redisState.port,
    },
  });
});

/**
 * @route GET /api/health/db
 * @desc Database health check endpoint
 * @access Public
 */
router.get('/db', (_req: Request, res: Response) => {
  const dbState = getConnectionState();

  const isConnected = dbState.readyState === 1;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(isConnected ? 200 : 503).json({
    database: {
      connected: isConnected,
      readyState: dbState.readyState,
      readyStateText:
        stateMap[dbState.readyState as keyof typeof stateMap] || 'unknown',
      host: dbState.host,
      port: dbState.port,
      name: dbState.name,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * @route GET /api/health/redis
 * @desc Redis health check endpoint
 * @access Public
 */
router.get('/redis', async (_req: Request, res: Response) => {
  const redisState = getRedisConnectionState();
  const redisHealthy = await isRedisHealthy().catch(() => false);

  res.status(redisHealthy ? 200 : 503).json({
    redis: {
      connected: redisHealthy,
      status: redisState.status,
      host: redisState.host,
      port: redisState.port,
      timestamp: new Date().toISOString(),
      fallback: !redisHealthy && redisState.status !== 'connected',
    },
  });
});

export default router;
