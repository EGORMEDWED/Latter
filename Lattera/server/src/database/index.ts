// Экспорт всех моделей
export { User, IUser, IUserProfile } from './models/User';
export { Chat, IChat, IChatLastMessage, IChatUnreadCount } from './models/Chat';
export { Message, IMessage, IMessageMedia } from './models/Message';
export { FeedbackRequest, IFeedbackRequest } from './models/FeedbackRequest';
export {
  SearchHistory,
  ISearchHistory,
  ISearchQuery,
} from './models/SearchHistory';
export { OnlineStatus, IOnlineStatus } from './models/OnlineStatus';
export { MediaFile, IMediaFile } from './models/MediaFile';
export { AuthService } from './services/AuthService';

// Экспорт функций подключения к MongoDB
export {
  connectDB,
  disconnectDB,
  getConnectionState,
} from './config/connection';
export { getDatabaseConfig } from './config/database';
export type { DatabaseConfig } from './config/database';

// Экспорт функций управления индексами
export {
  createIndexes,
  dropAllIndexes,
  getIndexesStats,
} from './indexes/indexes';

// Экспорт функций подключения к Redis
export {
  connectRedis,
  disconnectRedis,
  getRedis,
  isRedisConnected,
  getConnectionState as getRedisConnectionState,
  setupGracefulShutdown as setupRedisGracefulShutdown,
} from './config/redis/redisConnection';
export { getRedisConfig } from './config/redis/redisConfig';

// Экспорт Redis utility функций
export {
  setEmailCode,
  getEmailCode,
  deleteEmailCode,
  setRefreshToken,
  getRefreshToken,
  invalidateAllRefreshTokens,
  setUserStatus,
  getUserStatus,
  isRedisHealthy,
} from './redis/redisUtils';

// Экспорт Redis модуля
export { initializeRedis } from './redis';

// Экспорт S3 сервиса
export { s3Service } from './services/S3Service';

// Импортируем модели для default экспорта
import { User } from './models/User';
import { Chat } from './models/Chat';
import { Message } from './models/Message';
import { FeedbackRequest } from './models/FeedbackRequest';
import { SearchHistory } from './models/SearchHistory';
import { OnlineStatus } from './models/OnlineStatus';
import { MediaFile } from './models/MediaFile';
import {
  connectDB,
  disconnectDB,
  getConnectionState,
} from './config/connection';
import { getDatabaseConfig } from './config/database';
import {
  createIndexes,
  dropAllIndexes,
  getIndexesStats,
} from './indexes/indexes';

// Импортируем Redis функции
import {
  connectRedis,
  disconnectRedis,
  getRedis,
  isRedisConnected,
  getConnectionState as getRedisConnectionState,
  setupGracefulShutdown as setupRedisGracefulShutdown,
} from './config/redis/redisConnection';
import { getRedisConfig } from './config/redis/redisConfig';
import {
  setEmailCode,
  getEmailCode,
  deleteEmailCode,
  setRefreshToken,
  getRefreshToken,
  invalidateAllRefreshTokens,
  setUserStatus,
  getUserStatus,
  isRedisHealthy,
} from './redis/redisUtils';
import { initializeRedis } from './redis';

export default {
  // Models
  User,
  Chat,
  Message,
  FeedbackRequest,
  SearchHistory,
  OnlineStatus,
  MediaFile,

  // MongoDB Connection functions
  connectDB,
  disconnectDB,
  getConnectionState,
  getDatabaseConfig,

  // MongoDB Index functions
  createIndexes,
  dropAllIndexes,
  getIndexesStats,

  // Redis Connection functions
  connectRedis,
  disconnectRedis,
  getRedis,
  isRedisConnected,
  getRedisConnectionState,
  setupRedisGracefulShutdown,
  getRedisConfig,

  // Redis utility functions
  setEmailCode,
  getEmailCode,
  deleteEmailCode,
  setRefreshToken,
  getRefreshToken,
  invalidateAllRefreshTokens,
  setUserStatus,
  getUserStatus,
  isRedisHealthy,

  // Redis initialization
  initializeRedis,
};
