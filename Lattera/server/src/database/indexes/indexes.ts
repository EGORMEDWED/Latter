import { User } from '../models/User';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { FeedbackRequest } from '../models/FeedbackRequest';
import { SearchHistory } from '../models/SearchHistory';
import { OnlineStatus } from '../models/OnlineStatus';
import { MediaFile } from '../models/MediaFile';
import logger from '../../utils/logger';

/**
 * Функция для создания всех необходимых индексов в базе данных
 * Вызывается после успешного подключения к MongoDB
 */
export const createIndexes = async (): Promise<void> => {
  try {
    logger.info('🔍 Starting to create database indexes...');

    logger.info('📊 Creating indexes for users collection...');
    const userIndexes = await User.syncIndexes();
    logger.info(`✅ Users indexes synced: ${Object.keys(userIndexes).length} indexes`);

    logger.info('💬 Creating indexes for chats collection...');
    const chatIndexes = await Chat.syncIndexes();
    logger.info(`✅ Chats indexes synced: ${Object.keys(chatIndexes).length} indexes`);

    logger.info('📝 Creating indexes for messages collection...');
    const messageIndexes = await Message.syncIndexes();
    logger.info(`✅ Messages indexes synced: ${Object.keys(messageIndexes).length} indexes`);

    logger.info('📋 Creating indexes for feedbackRequests collection...');
    const feedbackRequestIndexes = await FeedbackRequest.syncIndexes();
    logger.info(`✅ FeedbackRequests indexes synced: ${Object.keys(feedbackRequestIndexes).length} indexes`);

    logger.info('🔍 Creating indexes for searchHistory collection...');
    const searchHistoryIndexes = await SearchHistory.syncIndexes();
    logger.info(`✅ SearchHistory indexes synced: ${Object.keys(searchHistoryIndexes).length} indexes`);

    logger.info('🟢 Creating indexes for onlineStatus collection...');
    const onlineStatusIndexes = await OnlineStatus.syncIndexes();
    logger.info(`✅ OnlineStatus indexes synced: ${Object.keys(onlineStatusIndexes).length} indexes`);

    logger.info('📎 Creating indexes for mediaFiles collection...');
    const mediaFileIndexes = await MediaFile.syncIndexes();
    logger.info(`✅ MediaFile indexes synced: ${Object.keys(mediaFileIndexes).length} indexes`);

    await createAdditionalIndexes();

    logger.info('🎉 All database indexes created successfully!');

  } catch (error: unknown) {
    logger.error('❌ Error creating indexes:', error);
    throw error;
  }
};

/**
 * Создание дополнительных индексов, которые не могут быть определены в схемах Mongoose
 */
const createAdditionalIndexes = async (): Promise<void> => {
  try {
    logger.info('⚙️  Creating additional custom indexes...');

    await User.collection.createIndex(
      { 'profile.category': 1, status: 1, lastSeen: -1 },
      { name: 'user_category_status_lastseen' }
    );
    logger.info('  ✅ User category+status+lastSeen index created');

    await User.collection.createIndex(
      { 'profile.skills': 1 },
      { name: 'user_skills_single' }
    );
    logger.info('  ✅ User skills single index created');

    await Message.collection.createIndex(
      { chatId: 1, senderId: 1, timestamp: -1 },
      { name: 'message_chat_sender_timestamp' }
    );
    logger.info('  ✅ Message chat+sender+timestamp index created');

    await FeedbackRequest.collection.createIndex(
      { status: 1, requestedAt: 1 },
      { name: 'feedback_request_status_requestedAt' }
    );
    logger.info('  ✅ Feedback request status+requestedAt index created');

    await SearchHistory.collection.createIndex(
      { 'query.category': 1, timestamp: -1 },
      { name: 'search_history_category_timestamp' }
    );
    logger.info('  ✅ Search history category+timestamp index created');

    try {
      await User.collection.createIndex(
        {
          'profile.company': 'text',
          'profile.skills': 'text',
          firstName: 'text',
          lastName: 'text'
        },
        {
          name: 'user_text_search',
          weights: {
            'profile.company': 3,
            'profile.skills': 2,
            firstName: 1,
            lastName: 1
          },
          default_language: 'russian'
        }
      );
      logger.info('  ✅ User text search index created');
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 85) {
        logger.info('  ℹ️  User text search index already exists');
      } else {
        throw error;
      }
    }

  } catch (error) {
    logger.error('❌ Error creating additional indexes:', error);
    throw error;
  }
};

/**
 * Функция для удаления всех индексов (используется для миграций)
 */
export const dropAllIndexes = async (): Promise<void> => {
  try {
    logger.info('🗑️  Dropping all database indexes...');

    const collections = [
      User.collection,
      Chat.collection,
      Message.collection,
      FeedbackRequest.collection,
      SearchHistory.collection,
      OnlineStatus.collection,
      MediaFile.collection
    ];

    for (const collection of collections) {
      await collection.dropIndexes();
      logger.info(`  ✅ Dropped all indexes for ${collection.collectionName}`);
    }

    logger.info('🎉 All indexes dropped successfully!');

  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 26) {
      logger.info('ℹ️  Some collections do not exist yet, skipping...');
    } else {
      logger.error('❌ Error dropping indexes:', error);
      throw error;
    }
  }
};

/**
 * Функция для получения статистики по индексам
 */
export const getIndexesStats = async (): Promise<Record<string, any>> => {
  try {
    const stats: Record<string, any> = {};

    const collections = [
      { name: 'users', model: User },
      { name: 'chats', model: Chat },
      { name: 'messages', model: Message },
      { name: 'feedbackRequests', model: FeedbackRequest },
      { name: 'searchHistory', model: SearchHistory },
      { name: 'onlineStatus', model: OnlineStatus },
      { name: 'mediaFiles', model: MediaFile }
    ];

    for (const { name, model } of collections) {
      try {
        const indexes = await model.collection.listIndexes().toArray();
        stats[name] = indexes.map((index: { name: string; key: Record<string, any>; unique?: boolean; sparse?: boolean }) => ({
          name: index.name,
          key: index.key,
          unique: index.unique || false,
          sparse: index.sparse || false
        }));
      } catch (error: unknown) {
        stats[name] = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return stats;

  } catch (error) {
    logger.error('❌ Error getting indexes stats:', error);
    throw error;
  }
};

export default {
  createIndexes,
  dropAllIndexes,
  getIndexesStats
};