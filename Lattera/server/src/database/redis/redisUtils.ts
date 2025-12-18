/**
 * Redis Utilities for Sessions and Caching
 * Utility functions for working with Redis for common use cases
 */

import { getRedis, isRedisConnected } from '../config/redis/redisConnection';
import { getRedisConfig } from '../config/redis/redisConfig';

// In-memory fallback storage (when Redis is not available)
class InMemoryFallback {
  private emailCodes = new Map<string, { code: string; timestamp: number }>();
  private refreshTokens = new Map<
    string,
    { tokens: Set<string>; timestamp: number }
  >();
  private userStatuses = new Map<
    string,
    { status: string; timestamp: number }
  >();

  // Email codes
  setEmailCode(email: string, code: string, ttl: number): boolean {
    const expiresAt = Date.now() + ttl * 1000;
    this.emailCodes.set(email, { code, timestamp: expiresAt });

    // Clean up expired codes periodically
    setTimeout(() => {
      const entry = this.emailCodes.get(email);
      if (entry && entry.timestamp <= Date.now()) {
        this.emailCodes.delete(email);
      }
    }, ttl * 1000);

    return true;
  }

  getEmailCode(email: string): string | null {
    const entry = this.emailCodes.get(email);
    if (!entry) return null;

    if (entry.timestamp <= Date.now()) {
      this.emailCodes.delete(email);
      return null;
    }

    return entry.code;
  }

  deleteEmailCode(email: string): boolean {
    return this.emailCodes.delete(email);
  }

  // Refresh tokens
  setRefreshToken(userId: string, token: string, ttl: number): boolean {
    const expiresAt = Date.now() + ttl * 1000;

    let userTokens = this.refreshTokens.get(userId);
    if (!userTokens) {
      userTokens = { tokens: new Set<string>(), timestamp: expiresAt };
      this.refreshTokens.set(userId, userTokens);
    } else {
      userTokens.timestamp = expiresAt;
    }

    userTokens.tokens.add(token);

    // Clean up expired tokens periodically
    setTimeout(() => {
      const entry = this.refreshTokens.get(userId);
      if (entry && entry.timestamp <= Date.now()) {
        this.refreshTokens.delete(userId);
      }
    }, ttl * 1000);

    return true;
  }

  getRefreshToken(userId: string): string | null {
    const entry = this.refreshTokens.get(userId);
    if (!entry) return null;

    if (entry.timestamp <= Date.now()) {
      this.refreshTokens.delete(userId);
      return null;
    }

    // Return any token (in real scenario, might want to manage multiple tokens better)
    return entry.tokens.values().next().value || null;
  }

  hasRefreshToken(userId: string, token: string): boolean {
    const entry = this.refreshTokens.get(userId);
    if (!entry) return false;

    if (entry.timestamp <= Date.now()) {
      this.refreshTokens.delete(userId);
      return false;
    }

    return entry.tokens.has(token);
  }

  invalidateAllRefreshTokens(userId: string): boolean {
    return this.refreshTokens.delete(userId);
  }

  // User status
  setUserStatus(userId: string, status: string, ttl: number): boolean {
    const expiresAt = Date.now() + ttl * 1000;
    this.userStatuses.set(userId, { status, timestamp: expiresAt });

    // Clean up expired status periodically
    setTimeout(() => {
      const entry = this.userStatuses.get(userId);
      if (entry && entry.timestamp <= Date.now()) {
        this.userStatuses.delete(userId);
      }
    }, ttl * 1000);

    return true;
  }

  getUserStatus(userId: string): string | null {
    const entry = this.userStatuses.get(userId);
    if (!entry) return null;

    if (entry.timestamp <= Date.now()) {
      this.userStatuses.delete(userId);
      return null;
    }

    return entry.status;
  }
}

const memoryFallback = new InMemoryFallback();

// Key generators for Redis
const generateKeys = {
  emailCode: (email: string) => `email:code:${email.toLowerCase()}`,
  refreshToken: (userId: string) => `user:refresh_token:${userId}`,
  allRefreshTokens: (userId: string) => `user:refresh_tokens:*`,
  userStatus: (userId: string) => `user:status:${userId}`,
};

// Email code functions
export const setEmailCode = async (
  email: string,
  code: string,
  ttl?: number
): Promise<boolean> => {
  const config = getRedisConfig();
  const expirationTime = ttl || config.emailCodeTTL;
  const key = generateKeys.emailCode(email);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        await redis.setex(key, expirationTime, code);
        console.log(`📧 Email code set for ${email} (TTL: ${expirationTime}s)`);
        return true;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for email code'
    );
    return memoryFallback.setEmailCode(email, code, expirationTime);
  } catch (error) {
    console.error('❌ Error setting email code:', error);
    console.warn('⚠️  Falling back to in-memory storage for email code');
    return memoryFallback.setEmailCode(email, code, expirationTime);
  }
};

export const getEmailCode = async (email: string): Promise<string | null> => {
  const key = generateKeys.emailCode(email);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        const code = await redis.get(key);
        console.log(
          `📧 Email code retrieved for ${email}: ${code ? 'FOUND' : 'NOT FOUND'}`
        );
        return code;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for email code'
    );
    return memoryFallback.getEmailCode(email);
  } catch (error) {
    console.error('❌ Error getting email code:', error);
    console.warn('⚠️  Falling back to in-memory storage for email code');
    return memoryFallback.getEmailCode(email);
  }
};

export const deleteEmailCode = async (email: string): Promise<boolean> => {
  const key = generateKeys.emailCode(email);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        const result = await redis.del(key);
        console.log(`📧 Email code deleted for ${email}`);
        return result > 0;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for email code'
    );
    return memoryFallback.deleteEmailCode(email);
  } catch (error) {
    console.error('❌ Error deleting email code:', error);
    console.warn('⚠️  Falling back to in-memory storage for email code');
    return memoryFallback.deleteEmailCode(email);
  }
};

// Refresh token functions
export const setRefreshToken = async (
  userId: string,
  token: string,
  ttl?: number
): Promise<boolean> => {
  const config = getRedisConfig();
  const expirationTime = ttl || config.refreshTokenTTL;
  const key = generateKeys.refreshToken(userId);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        // Use a set to support multiple refresh tokens per user
        await redis.sadd(key, token);
        await redis.expire(key, expirationTime);
        console.log(
          `🔑 Refresh token set for user ${userId} (TTL: ${expirationTime}s)`
        );
        return true;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for refresh token'
    );
    return memoryFallback.setRefreshToken(userId, token, expirationTime);
  } catch (error) {
    console.error('❌ Error setting refresh token:', error);
    console.warn('⚠️  Falling back to in-memory storage for refresh token');
    return memoryFallback.setRefreshToken(userId, token, expirationTime);
  }
};

export const getRefreshToken = async (
  userId: string
): Promise<string | null> => {
  const key = generateKeys.refreshToken(userId);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        const tokens = await redis.smembers(key);
        // Return the first token found
        const token = tokens.length > 0 ? tokens[0] : null;
        console.log(
          `🔑 Refresh token retrieved for user ${userId}: ${token ? 'FOUND' : 'NOT FOUND'}`
        );
        return token;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for refresh token'
    );
    return memoryFallback.getRefreshToken(userId);
  } catch (error) {
    console.error('❌ Error getting refresh token:', error);
    console.warn('⚠️  Falling back to in-memory storage for refresh token');
    return memoryFallback.getRefreshToken(userId);
  }
};

export const hasRefreshToken = async (
  userId: string,
  token: string
): Promise<boolean> => {
  const key = generateKeys.refreshToken(userId);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        const result = await redis.sismember(key, token);
        return result === 1;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for refresh token verification'
    );
    return memoryFallback.hasRefreshToken(userId, token);
  } catch (error) {
    console.error('❌ Error verifying refresh token:', error);
    console.warn(
      '⚠️  Falling back to in-memory storage for refresh token verification'
    );
    return memoryFallback.hasRefreshToken(userId, token);
  }
};

export const invalidateAllRefreshTokens = async (
  userId: string
): Promise<boolean> => {
  const key = generateKeys.refreshToken(userId);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        const result = await redis.del(key);
        console.log(`🔑 All refresh tokens invalidated for user ${userId}`);
        return result > 0;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for refresh tokens'
    );
    return memoryFallback.invalidateAllRefreshTokens(userId);
  } catch (error) {
    console.error('❌ Error invalidating refresh tokens:', error);
    console.warn('⚠️  Falling back to in-memory storage for refresh tokens');
    return memoryFallback.invalidateAllRefreshTokens(userId);
  }
};

// User status functions
export const setUserStatus = async (
  userId: string,
  status: string,
  ttl?: number
): Promise<boolean> => {
  const config = getRedisConfig();
  const expirationTime = ttl || config.userStatusTTL;
  const key = generateKeys.userStatus(userId);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        await redis.setex(key, expirationTime, status);
        console.log(
          `👤 User status set for ${userId}: ${status} (TTL: ${expirationTime}s)`
        );
        return true;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for user status'
    );
    return memoryFallback.setUserStatus(userId, status, expirationTime);
  } catch (error) {
    console.error('❌ Error setting user status:', error);
    console.warn('⚠️  Falling back to in-memory storage for user status');
    return memoryFallback.setUserStatus(userId, status, expirationTime);
  }
};

export const getUserStatus = async (userId: string): Promise<string | null> => {
  const key = generateKeys.userStatus(userId);

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        const status = await redis.get(key);
        console.log(
          `👤 User status retrieved for ${userId}: ${status || 'OFFLINE'}`
        );
        return status;
      }
    }

    console.warn(
      '⚠️  Redis not connected, using in-memory fallback for user status'
    );
    return memoryFallback.getUserStatus(userId);
  } catch (error) {
    console.error('❌ Error getting user status:', error);
    console.warn('⚠️  Falling back to in-memory storage for user status');
    return memoryFallback.getUserStatus(userId);
  }
};

// Health check function
export const isRedisHealthy = async (): Promise<boolean> => {
  if (!isRedisConnected()) {
    return false;
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return false;
    }
    await redis.ping();
    return true;
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
};

export default {
  setEmailCode,
  getEmailCode,
  deleteEmailCode,
  setRefreshToken,
  getRefreshToken,
  hasRefreshToken,
  invalidateAllRefreshTokens,
  setUserStatus,
  getUserStatus,
  isRedisHealthy,
};
