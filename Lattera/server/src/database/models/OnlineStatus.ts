import mongoose, { Document, Schema } from 'mongoose';

export interface IOnlineStatus extends Document {
  userId: mongoose.Types.ObjectId;
  status: 'online' | 'away';
  lastPing: Date;
}

const OnlineStatusSchema = new Schema<IOnlineStatus>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['online', 'away'],
    default: 'online',
    required: true,
    index: true
  },
  lastPing: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false, // Используем собственное поле lastPing
  collection: 'onlineStatus'
});

// Индексы для оптимизации запросов

// Unique index на userId (один статус на пользователя)
OnlineStatusSchema.index({ userId: 1 }, { unique: true });

// Index на status для быстрого поиска онлайн пользователей
OnlineStatusSchema.index({ status: 1 });

// Index на lastPing для TTL (автоматическое отключение через 5 минут)
OnlineStatusSchema.index({ lastPing: 1 });

// TTL индекс для автоматического удаления статусов старше 5 минут
OnlineStatusSchema.index(
  { lastPing: 1 }, 
  { 
    expireAfterSeconds: 300, // 5 минут = 5 * 60 = 300 секунд
    name: 'online_status_ttl'
  }
);

// Static method для обновления статуса пользователя
OnlineStatusSchema.statics.updateUserStatus = async function(
  userId: mongoose.Types.ObjectId,
  status: 'online' | 'away'
) {
  const update = {
    status,
    lastPing: new Date()
  };

  // Используем upsert для создания или обновления
  return this.findOneAndUpdate(
    { userId },
    { $set: update },
    { upsert: true, new: true }
  );
};

// Static method для получения онлайн статуса пользователей
OnlineStatusSchema.statics.getOnlineUsers = function(userIds: mongoose.Types.ObjectId[]) {
  return this.find({
    userId: { $in: userIds },
    status: 'online'
  });
};

// Static method для получения всех онлайн пользователей
OnlineStatusSchema.statics.getAllOnlineUsers = function() {
  return this.find({ status: 'online' });
};

// Method для обновления статуса
OnlineStatusSchema.methods.updatePing = function(status: 'online' | 'away' = 'online') {
  this.status = status;
  this.lastPing = new Date();
  return this.save();
};

// Method для проверки, активен ли статус (не истек)
OnlineStatusSchema.methods.isActive = function(): boolean {
  const expiryTime = new Date(this.lastPing.getTime() + 5 * 60 * 1000); // 5 минут
  return new Date() <= expiryTime;
};

// Method для проверки, истек ли статус
OnlineStatusSchema.methods.isExpired = function(): boolean {
  return !this.isActive();
};

export const OnlineStatus = mongoose.model<IOnlineStatus>('OnlineStatus', OnlineStatusSchema);

export default OnlineStatus;