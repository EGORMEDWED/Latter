/**
 * Redis Configuration
 * Configuration for Redis connection and settings
 */

export interface RedisConfig {
  url: string;
  maxRetries: number;
  retryDelay: number;
  connectTimeout: number;
  // TTL settings (in seconds)
  emailCodeTTL: number;
  refreshTokenTTL: number;
  userStatusTTL: number;
}

export const getRedisConfig = (): RedisConfig => {
  const config = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
    emailCodeTTL: parseInt(process.env.REDIS_EMAIL_CODE_TTL || '600', 10),
    refreshTokenTTL: parseInt(process.env.REDIS_REFRESH_TOKEN_TTL || '604800', 10),
    userStatusTTL: parseInt(process.env.REDIS_USER_STATUS_TTL || '300', 10),
  };

  console.log('🔧 Redis Configuration:');
  console.log(`📍 URL: ${config.url.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`🔄 Max retries: ${config.maxRetries}`);
  console.log(`⏱️  Retry delay: ${config.retryDelay}ms`);
  console.log(`🔌 Connect timeout: ${config.connectTimeout}ms`);
  console.log(`📧 Email code TTL: ${config.emailCodeTTL}s (${Math.floor(config.emailCodeTTL / 60)} min)`);
  console.log(`🔑 Refresh token TTL: ${config.refreshTokenTTL}s (${Math.floor(config.refreshTokenTTL / 86400)} days)`);
  console.log(`👤 User status TTL: ${config.userStatusTTL}s (${Math.floor(config.userStatusTTL / 60)} min)`);

  return config;
};

export default getRedisConfig;