/**
 * Redis Module Entry Point
 * Exports Redis connection, configuration, and utilities
 */

export { connectRedis, disconnectRedis, getRedis, isRedisConnected, getConnectionState, setupGracefulShutdown } from '../config/redis/redisConnection';
export { getRedisConfig } from '../config/redis/redisConfig';
export * from './redisUtils';

import { connectRedis, setupGracefulShutdown } from '../config/redis/redisConnection';
import type Redis from 'ioredis';

// Initialize Redis connection and setup graceful shutdown
export const initializeRedis = async (): Promise<Redis | null> => {
  try {
    await connectRedis();
    setupGracefulShutdown();
    return await connectRedis();
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    // Don't throw - Redis is optional and we'll fallback to in-memory storage
    return null;
  }
};

export default {
  initializeRedis,
};