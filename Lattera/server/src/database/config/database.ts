import mongoose from 'mongoose';

export interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

export const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lettera';
  
  const options: mongoose.ConnectOptions = {
    // Connection pool settings для production
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10'),
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '2'),
    
    // Timeouts
    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '5000'),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'),
    connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'),
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
    
    // Buffering
    bufferCommands: false,
    
    // Additional options
    autoIndex: process.env.NODE_ENV !== 'production',
    writeConcern: {
      w: process.env.NODE_ENV === 'production' ? 'majority' : 0
    },
    readConcern: {
      level: process.env.NODE_ENV === 'production' ? 'majority' : 'local'
    }
  };

  return {
    uri,
    options
  };
};

export default getDatabaseConfig;