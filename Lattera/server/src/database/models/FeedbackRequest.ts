import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedbackRequest extends Document {
  messageId: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  responderId: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  status: 'pending' | 'responded' | 'expired';
  requestedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
}

const FeedbackRequestSchema = new Schema<IFeedbackRequest>({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    unique: true,
    index: true
  },
  requesterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  responderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'responded', 'expired'],
    default: 'pending',
    required: true,
    index: true
  },
  requestedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  respondedAt: {
    type: Date,
    required: false
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: false, // Используем собственные поля времени
  collection: 'feedbackRequests'
});

// Индексы для оптимизации запросов

// Unique index на messageId (один запрос на одно сообщение)
FeedbackRequestSchema.index({ messageId: 1 }, { unique: true });

// Compound indexes для быстрых запросов
FeedbackRequestSchema.index({ requesterId: 1, status: 1 });
FeedbackRequestSchema.index({ responderId: 1, status: 1 });
FeedbackRequestSchema.index({ chatId: 1, status: 1 });

// Index на expiresAt для TTL (автоматическое закрытие просроченных запросов)
FeedbackRequestSchema.index({ expiresAt: 1 });

// TTL индекс для автоматического удаления истекших запросов через 30 дней после expiresAt
FeedbackRequestSchema.index(
  { expiresAt: 1 }, 
  { 
    expireAfterSeconds: 2592000, // 30 дней = 30 * 24 * 60 * 60 = 2592000 секунд
    name: 'feedback_request_ttl'
  }
);

// Pre-save middleware для установки expiresAt
FeedbackRequestSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Устанавливаем срок истечения на 7 дней от текущего времени
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Static method для создания нового запроса обратной связи
FeedbackRequestSchema.statics.createFeedbackRequest = async function(
  messageId: mongoose.Types.ObjectId,
  requesterId: mongoose.Types.ObjectId,
  responderId: mongoose.Types.ObjectId,
  chatId: mongoose.Types.ObjectId
) {
  const feedbackRequest = new this({
    messageId,
    requesterId,
    responderId,
    chatId,
    requestedAt: new Date(),
    status: 'pending'
  });
  
  return feedbackRequest.save();
};

// Static method для получения активных запросов пользователя
FeedbackRequestSchema.statics.getActiveRequestsForUser = function(userId: mongoose.Types.ObjectId) {
  return this.find({
    $or: [
      { requesterId: userId },
      { responderId: userId }
    ],
    status: 'pending'
  }).populate('messageId').populate('requesterId responderId chatId');
};

// Static method для получения просроченных запросов
FeedbackRequestSchema.statics.getExpiredRequests = function() {
  return this.find({
    status: 'pending',
    expiresAt: { $lt: new Date() }
  });
};

// Method для ответа на запрос
FeedbackRequestSchema.methods.respond = function() {
  this.status = 'responded';
  this.respondedAt = new Date();
  return this.save();
};

// Method для истечения запроса
FeedbackRequestSchema.methods.expire = function() {
  this.status = 'expired';
  return this.save();
};

// Method для проверки, истек ли запрос
FeedbackRequestSchema.methods.isExpired = function(): boolean {
  return this.status === 'expired' || this.expiresAt < new Date();
};

// Method для проверки, активен ли запрос
FeedbackRequestSchema.methods.isActive = function(): boolean {
  return this.status === 'pending' && !this.isExpired();
};

export const FeedbackRequest = mongoose.model<IFeedbackRequest>('FeedbackRequest', FeedbackRequestSchema);

export default FeedbackRequest;