import mongoose from 'mongoose';
import { getDatabaseConfig } from './database';
import logger from '../../utils/logger';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) {
    logger.info('📊 MongoDB: Already connected to database');
    return;
  }

  try {
    const config = getDatabaseConfig();
    
    logger.info('🔄 Connecting to MongoDB...');
    logger.info(`📍 Database URI: ${config.uri.replace(/\/\/.*@/, '//***:***@')}`);
    logger.info(`⚙️  Connection pool: ${config.options.minPoolSize}-${config.options.maxPoolSize} connections`);

    await mongoose.connect(config.uri, config.options);
    
    isConnected = true;
    
    logger.info('✅ MongoDB: Successfully connected to database');
    logger.info(`🗄️  Database name: ${mongoose.connection.name}`);
    logger.info(`📊 Connection state: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    mongoose.connection.on('connected', () => {
      logger.info('📡 MongoDB: Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB: Connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  MongoDB: Disconnected from MongoDB');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB: Reconnected to MongoDB');
      isConnected = true;
    });

    process.on('SIGINT', async () => {
      await disconnectDB();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await disconnectDB();
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ MongoDB: Failed to connect to database');
    logger.error('💥 Error details:', error);
    isConnected = false;
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected) {
    logger.info('📊 MongoDB: Already disconnected');
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('👋 MongoDB: Successfully disconnected from database');
  } catch (error) {
    logger.error('❌ MongoDB: Error during disconnection:', error);
    throw error;
  }
};

export const getConnectionState = (): {
  readyState: number;
  host: string;
  port: number;
  name: string;
} => {
  return {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

export default mongoose;