import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageMedia {
  type: 'image' | 'audio' | 'video';
  url: string;
  metadata?: {
    duration?: number; // Для аудио/видео (в секундах)
    width?: number;    // Для изображений
    height?: number;
  };
}

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  media?: IMessageMedia;
  editedAt?: Date;
  deletedFor: mongoose.Types.ObjectId[];
  timestamp: Date;
  feedbackRequested: boolean;
}

const MessageMediaSchema = new Schema<IMessageMedia>({
  type: {
    type: String,
    enum: ['image', 'audio', 'video'],
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  metadata: {
    type: {
      duration: {
        type: Number,
        min: 0,
        max: 3600 // максимум 1 час для видео/аудио
      },
      width: {
        type: Number,
        min: 1,
        max: 3840 // 4K максимум
      },
      height: {
        type: Number,
        min: 1,
        max: 2160
      }
    },
    required: false
  }
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 4000,
    default: '' // Пустой контент допустим, если есть media
  },
  media: {
    type: MessageMediaSchema,
    required: false
  },
  editedAt: {
    type: Date,
    required: false
  },
  deletedFor: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    default: [],
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  feedbackRequested: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: false, // Используем собственное поле timestamp
  collection: 'messages'
});

// Индексы для оптимизации запросов

// Compound index для быстрой загрузки истории чата (сортировка по времени)
MessageSchema.index({ chatId: 1, timestamp: -1 });

// Single indexes для дополнительных запросов
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ feedbackRequested: 1, timestamp: -1 });

// Index для soft delete - поиск сообщений, которые не удалены для пользователя
MessageSchema.index({ chatId: 1, timestamp: -1 });

// TTL индекс для автоматической очистки старых медиа (опционально)
// Раскомментировать, если нужно автоматически удалять медиа через 30 дней
// MessageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 дней

// Method для проверки, удалено ли сообщение для пользователя
MessageSchema.methods.isDeletedFor = function(userId: mongoose.Types.ObjectId): boolean {
  return this.deletedFor.some((deletedUserId: mongoose.Types.ObjectId) => 
    deletedUserId.equals(userId)
  );
};

// Method для soft delete сообщения для пользователя
MessageSchema.methods.deleteForUser = function(userId: mongoose.Types.ObjectId) {
  const userIdStr = userId.toString();
  const deletedForStrings = this.deletedFor.map((id: mongoose.Types.ObjectId) => id.toString());
  
  if (!deletedForStrings.includes(userIdStr)) {
    this.deletedFor.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Method для редактирования сообщения
MessageSchema.methods.edit = function(newContent: string) {
  this.content = newContent;
  this.editedAt = new Date();
  return this.save();
};

// Method для отметки запроса обратной связи
MessageSchema.methods.requestFeedback = function() {
  this.feedbackRequested = true;
  return this.save();
};

// Method для отмены запроса обратной связи
MessageSchema.methods.cancelFeedbackRequest = function() {
  this.feedbackRequested = false;
  return this.save();
};

// Virtual для проверки, было ли сообщение отредактировано
MessageSchema.virtual('isEdited').get(function() {
  return this.editedAt !== undefined;
});

// Virtual для проверки, есть ли медиа
MessageSchema.virtual('hasMedia').get(function() {
  return this.media !== undefined;
});

// Virtual для проверки, пустое ли сообщение (только медиа)
MessageSchema.virtual('isMediaOnly').get(function() {
  return !this.content || this.content.trim() === '';
});

// Ensure virtual fields are serialized
MessageSchema.set('toJSON', { virtuals: true });
MessageSchema.set('toObject', { virtuals: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

export default Message;