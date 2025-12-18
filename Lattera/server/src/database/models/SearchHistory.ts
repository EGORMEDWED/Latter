import mongoose, { Document, Schema } from 'mongoose';

export interface ISearchQuery {
  category?: string;
  company?: string;
  skills?: string[];
}

export interface ISearchHistory extends Document {
  userId: mongoose.Types.ObjectId;
  query: ISearchQuery;
  resultsCount: number;
  timestamp: Date;
}

const SearchQuerySchema = new Schema<ISearchQuery>({
  category: {
    type: String,
    trim: true,
    maxlength: 50
  },
  company: {
    type: String,
    trim: true,
    maxlength: 100
  },
  skills: [{
    type: String,
    trim: true,
    maxlength: 50
  }]
}, { _id: false });

const SearchHistorySchema = new Schema<ISearchHistory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  query: {
    type: SearchQuerySchema,
    required: true
  },
  resultsCount: {
    type: Number,
    required: true,
    min: 0,
    max: 1000
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false, // Используем собственное поле timestamp
  collection: 'searchHistory'
});

// Индексы для оптимизации запросов

// Single index для быстрого поиска истории поиска конкретного пользователя
SearchHistorySchema.index({ userId: 1, timestamp: -1 });

// Index на timestamp для TTL (автоочистка старше 90 дней)
SearchHistorySchema.index({ timestamp: 1 });

// TTL индекс для автоматического удаления истории старше 90 дней
SearchHistorySchema.index(
  { timestamp: 1 }, 
  { 
    expireAfterSeconds: 7776000, // 90 дней = 90 * 24 * 60 * 60 = 7776000 секунд
    name: 'search_history_ttl'
  }
);

// Index для агрегирования статистики поиска по категориям
SearchHistorySchema.index({ 'query.category': 1, timestamp: -1 });

// Index для анализа популярности компаний
SearchHistorySchema.index({ 'query.company': 1, timestamp: -1 });

// Index для анализа популярности навыков (сквозной по массиву)
SearchHistorySchema.index({ 'query.skills': 1, timestamp: -1 });

// Static method для добавления записи о поиске
SearchHistorySchema.statics.addSearchRecord = async function(
  userId: mongoose.Types.ObjectId,
  query: ISearchQuery,
  resultsCount: number
) {
  const searchRecord = new this({
    userId,
    query,
    resultsCount,
    timestamp: new Date()
  });
  
  return searchRecord.save();
};

// Static method для получения истории поиска пользователя
SearchHistorySchema.statics.getUserSearchHistory = function(
  userId: mongoose.Types.ObjectId,
  limit: number = 20,
  skip: number = 0
) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method для получения популярных поисковых запросов
SearchHistorySchema.statics.getPopularQueries = function(
  timeFrame: 'day' | 'week' | 'month' = 'week',
  limit: number = 10
) {
  const now = new Date();
  let startDate: Date;
  
  switch (timeFrame) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          category: '$query.category',
          company: '$query.company'
        },
        count: { $sum: 1 },
        avgResults: { $avg: '$resultsCount' },
        lastSearch: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        query: '$_id',
        count: 1,
        avgResults: 1,
        lastSearch: 1,
        _id: 0
      }
    }
  ]);
};

// Static method для получения статистики навыков
SearchHistorySchema.statics.getPopularSkills = function(
  timeFrame: 'day' | 'week' | 'month' = 'week',
  limit: number = 20
) {
  const now = new Date();
  let startDate: Date;
  
  switch (timeFrame) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        'query.skills': { $exists: true, $ne: [] }
      }
    },
    {
      $unwind: '$query.skills'
    },
    {
      $group: {
        _id: '$query.skills',
        count: { $sum: 1 },
        totalResults: { $sum: '$resultsCount' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        skill: '$_id',
        count: 1,
        avgResults: { $divide: ['$totalResults', '$count'] },
        _id: 0
      }
    }
  ]);
};

// Method для проверки, истекла ли запись (для TTL)
SearchHistorySchema.methods.isExpired = function(): boolean {
  const expiryDate = new Date(this.timestamp.getTime() + 90 * 24 * 60 * 60 * 1000);
  return new Date() > expiryDate;
};

export const SearchHistory = mongoose.model<ISearchHistory>('SearchHistory', SearchHistorySchema);

export default SearchHistory;