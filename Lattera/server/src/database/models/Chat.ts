import mongoose, { Document, Schema } from 'mongoose';

export interface IChatLastMessage {
  content: string;
  senderId: mongoose.Types.ObjectId;
  timestamp: Date;
}

export interface IChatUnreadCount {
  [userId: string]: number;
}

export interface IChat extends Document {
  type: 'private';
  participants: mongoose.Types.ObjectId[];
  lastMessage?: IChatLastMessage;
  unreadCount: IChatUnreadCount;
  createdAt: Date;
  updatedAt: Date;
}

const ChatLastMessageSchema = new Schema<IChatLastMessage>({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, { _id: false });

const ChatSchema = new Schema<IChat>({
  type: {
    type: String,
    enum: ['private'],
    default: 'private',
    required: true
  },
  participants: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    required: true,
    validate: {
      validator: function(participants: mongoose.Types.ObjectId[]) {
        return participants.length === 2;
      },
      message: 'Private chat must have exactly 2 participants'
    }
  },
  lastMessage: {
    type: ChatLastMessageSchema,
    required: false
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  collection: 'chats'
});

// Индексы для оптимизации запросов

// Unique sparse index для гарантии одного чата между двумя пользователями
ChatSchema.index(
  { participants: 1 },
  { 
    unique: true, 
    sparse: true,
    name: 'unique_chat_participants'
  }
);

// Single index для быстрого поиска чатов по участнику
ChatSchema.index({ participants: 1 });
ChatSchema.index({ participants: 1, updatedAt: -1 });

// Single index для сортировки чатов по актуальности
ChatSchema.index({ updatedAt: -1 });

// Method для проверки, является ли пользователь участником чата
ChatSchema.methods.isParticipant = function(userId: mongoose.Types.ObjectId): boolean {
  return this.participants.some((participant: mongoose.Types.ObjectId) => 
    participant.equals(userId)
  );
};

// Method для получения собеседника
ChatSchema.methods.getOtherParticipant = function(currentUserId: mongoose.Types.ObjectId): mongoose.Types.ObjectId | null {
  const otherParticipants = this.participants.filter((participant: mongoose.Types.ObjectId) => 
    !participant.equals(currentUserId)
  );
  return otherParticipants.length > 0 ? otherParticipants[0] : null;
};

// Method для обновления счетчика непрочитанных
ChatSchema.methods.updateUnreadCount = function(userId: mongoose.Types.ObjectId, increment: number = 1) {
  const userIdStr = userId.toString();
  const currentCount = this.unreadCount.get(userIdStr) || 0;
  this.unreadCount.set(userIdStr, Math.max(0, currentCount + increment));
  return this.save();
};

// Method для сброса счетчика непрочитанных
ChatSchema.methods.markAsRead = function(userId: mongoose.Types.ObjectId) {
  const userIdStr = userId.toString();
  this.unreadCount.set(userIdStr, 0);
  return this.save();
};

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;