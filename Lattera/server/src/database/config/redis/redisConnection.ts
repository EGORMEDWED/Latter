import Redis from 'ioredis';
import { getRedisConfig } from './redisConfig';

let redis: Redis | null = null;
let isConnected = false;

export const connectRedis = async (): Promise<Redis> => {
  if (isConnected && redis) {
    console.log('📡 Redis: Already connected to Redis');
    return redis;
  }

  try {
    const config = getRedisConfig();
    
    console.log('🔄 Connecting to Redis...');
    
    redis = new Redis(config.url, {
      enableOfflineQueue: true, // Enable offline queue for commands when disconnected
      enableReadyCheck: true,   // Enable ready check for Redis connection
      lazyConnect: false,       // Don't wait for connection to be established
    });

    // Connection event handlers
    redis.on('connect', () => {
      console.log('📡 Redis: Connecting to Redis server...');
    });

    redis.on('ready', () => {
      console.log('✅ Redis: Successfully connected to Redis server');
      console.log(`🗄️  Redis info: ${redis?.options.host}:${redis?.options.port}`);
      isConnected = true;
    });

    redis.on('error', (err) => {
      console.error('❌ Redis: Connection error:', err.message);
      isConnected = false;
    });

    redis.on('close', () => {
      console.warn('⚠️  Redis: Connection closed');
      isConnected = false;
    });

    redis.on('reconnecting', (delay: number) => {
      console.log(`🔄 Redis: Reconnecting in ${delay}ms...`);
    });

    redis.on('end', () => {
      console.log('👋 Redis: Connection ended');
      isConnected = false;
    });

    // Test the connection
    await redis.ping();
    console.log('✅ Redis: Connection test successful (PING -> PONG)');
    
    return redis;

  } catch (error) {
    console.error('❌ Redis: Failed to connect to Redis');
    console.error('💥 Error details:', error);
    isConnected = false;
    
    // Fallback to null but don't throw - we'll handle Redis unavailability in utility functions
    redis = null;
    throw error;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (!redis || !isConnected) {
    console.log('📊 Redis: Already disconnected');
    return;
  }

  try {
    console.log('🔌 Disconnecting from Redis...');
    await redis.quit(); // Graceful shutdown with QUIT command
    redis = null;
    isConnected = false;
    console.log('👋 Redis: Successfully disconnected from Redis');
  } catch (error) {
    console.error('❌ Redis: Error during disconnection:', error);
    // Force disconnect if graceful fails
    try {
      redis?.disconnect();
      redis = null;
      isConnected = false;
      console.log('⚡ Redis: Forcefully disconnected');
    } catch (forceError) {
      console.error('❌ Redis: Error during force disconnect:', forceError);
    }
    throw error;
  }
};

export const getRedis = (): Redis | null => {
  if (!redis || !isConnected) {
    console.warn('⚠️  Redis: No active connection available');
    return null;
  }
  return redis;
};

export const isRedisConnected = (): boolean => {
  return isConnected && redis !== null && redis.status === 'ready';
};

export const getConnectionState = () => {
  if (!redis) {
    return {
      status: 'disconnected',
      connected: false,
      host: null,
      port: null,
    };
  }

  return {
    status: redis.status,
    connected: isConnected,
    host: redis.options.host,
    port: redis.options.port,
  };
};

// Graceful shutdown handlers for integration with main server
export const setupGracefulShutdown = () => {
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT. Shutting down Redis connection...');
    await disconnectRedis();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM. Shutting down Redis connection...');
    await disconnectRedis();
    process.exit(0);
  });

  process.on('SIGUSR2', async () => { // Nodemon restart
    console.log('\n🛑 Received SIGUSR2. Shutting down Redis connection...');
    await disconnectRedis();
  });
};

export default redis;