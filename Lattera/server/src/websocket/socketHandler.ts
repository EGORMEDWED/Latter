import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import AuthService from '../database/services/AuthService';
import { User } from '../database/models/User';
import { Chat } from '../database/models/Chat';
import { OnlineStatus } from '../database/models/OnlineStatus';
import logger from '../utils/logger';

// Types for socket data
interface SocketData {
  userId: string;
  chatIds: Set<string>;
}

// Types for events
interface NewMessageData {
  messageId: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

interface DeletedMessageData {
  messageId: string;
  chatId: string;
}

interface EditedMessageData {
  messageId: string;
  chatId: string;
  content: string;
  editedAt: string;
}

class SocketHandler {
  private io: Server;
  private redisClient: Redis | null;
  private redisAdapter: any;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(io: Server, redisClient: Redis | null = null) {
    this.io = io;
    this.redisClient = redisClient;

    // Setup Redis adapter if Redis is available
    if (redisClient) {
      this.setupRedisAdapter();
    }

    this.setupEventHandlers();
  }

  private setupRedisAdapter(): void {
    try {
      const pubClient = this.redisClient!;
      const subClient = this.redisClient!.duplicate();

      this.redisAdapter = createAdapter(pubClient, subClient);
      this.io.adapter(this.redisAdapter);

      logger.info(
        '🔗 Redis adapter configured for Socket.io (horizontal scaling enabled)'
      );
    } catch (error) {
      logger.warn('⚠️  Failed to setup Redis adapter for Socket.io:', error);
    }
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  private async handleConnection(socket: Socket): Promise<void> {
    try {
      // Authenticate user
      const token = this.extractToken(socket);
      if (!token) {
        socket.emit('error', { message: 'Authentication token required' });
        socket.disconnect(true);
        return;
      }

      // Verify JWT token
      const authResult = AuthService.verifyAccessToken(token);
      if (!authResult.valid || !authResult.userId) {
        socket.emit('error', { message: 'Invalid or expired token' });
        socket.disconnect(true);
        return;
      }

      const userId = authResult.userId;

      // Store userId in socket data
      (socket.data as SocketData).userId = userId;
      (socket.data as SocketData).chatIds = new Set();

      // Register socket for user
      this.registerUserSocket(userId, socket.id);

      // Update user online status
      await this.updateUserOnlineStatus(userId);

      // Join user to their personal room
      socket.join(`user:${userId}`);

      // Join user to their chat rooms
      await this.joinUserChatRooms(userId, socket);

      // Emit user online event to relevant users
      await this.broadcastUserOnlineStatus(userId);

      logger.info(
        `👤 User ${userId} connected via Socket.io (socket: ${socket.id})`
      );

      // Handle typing events
      this.setupTypingHandlers(socket);

      // Handle disconnect
      this.setupDisconnectHandler(socket);

      // Send initial online status to user
      socket.emit('user:online', {
        userId,
        status: 'online',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Socket connection error:', error);
      socket.emit('error', { message: 'Connection failed' });
      socket.disconnect(true);
    }
  }

  private extractToken(socket: Socket): string | null {
    // Try to get token from query parameter
    const token = socket.handshake.query.token as string;
    if (token) {
      return token;
    }

    // Try to get token from authorization header
    const authHeader = socket.handshake.auth.token;
    if (authHeader) {
      return authHeader;
    }

    return null;
  }

  private registerUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private unregisterUserSocket(userId: string, socketId: string): void {
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  private async updateUserOnlineStatus(userId: string): Promise<void> {
    try {
      // Use the static method defined in OnlineStatus model
      await (OnlineStatus as any).updateUserStatus(userId, 'online');

      // Also update the User model
      await User.findByIdAndUpdate(userId, {
        status: 'online',
        lastSeen: new Date(),
      });
    } catch (error) {
      logger.error('Error updating user online status:', error);
    }
  }

  private async updateUserOfflineStatus(userId: string): Promise<void> {
    try {
      await User.findByIdAndUpdate(userId, {
        status: 'offline',
        lastSeen: new Date(),
      });
    } catch (error) {
      logger.error('Error updating user offline status:', error);
    }
  }

  private async joinUserChatRooms(
    userId: string,
    socket: Socket
  ): Promise<void> {
    try {
      // Find all chats where user is a participant
      const chats = await Chat.find({
        participants: userId,
      });

      for (const chat of chats) {
        socket.join(`chat:${chat._id}`);
        (socket.data as SocketData).chatIds.add((chat._id as any).toString());
      }

      logger.info(`💬 User ${userId} joined ${chats.length} chat rooms`);
    } catch (error) {
      logger.error('Error joining user chat rooms:', error);
    }
  }

  private async broadcastUserOnlineStatus(userId: string): Promise<void> {
    try {
      // Get all chats where user participates
      const chats = await Chat.find({
        participants: userId,
      });

      // Get all other participants in these chats
      const otherUserIds = new Set<string>();
      chats.forEach(chat => {
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== userId) {
            otherUserIds.add(participantId.toString());
          }
        });
      });

      // Emit to all other users in user's chats
      otherUserIds.forEach(otherUserId => {
        this.io.to(`user:${otherUserId}`).emit('user:online', {
          userId,
          status: 'online',
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      logger.error('Error broadcasting user online status:', error);
    }
  }

  private async broadcastUserOfflineStatus(userId: string): Promise<void> {
    try {
      // Get all chats where user participates
      const chats = await Chat.find({
        participants: userId,
      });

      // Get all other participants in these chats
      const otherUserIds = new Set<string>();
      chats.forEach(chat => {
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== userId) {
            otherUserIds.add(participantId.toString());
          }
        });
      });

      // Emit to all other users in user's chats
      otherUserIds.forEach(otherUserId => {
        this.io.to(`user:${otherUserId}`).emit('user:offline', {
          userId,
          status: 'offline',
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      logger.error('Error broadcasting user offline status:', error);
    }
  }

  private setupTypingHandlers(socket: Socket): void {
    const userId = (socket.data as SocketData).userId;

    socket.on('user:typing', (data: { chatId: string }) => {
      const { chatId } = data;
      if (!chatId) return;

      // Emit to other users in the same chat (excluding sender)
      socket.to(`chat:${chatId}`).emit('user:typing', {
        userId,
        chatId,
        isTyping: true,
      });

      // Auto-stop typing after 3 seconds
      setTimeout(() => {
        socket.to(`chat:${chatId}`).emit('user:typing', {
          userId,
          chatId,
          isTyping: false,
        });
      }, 3000);
    });

    socket.on('user:stop-typing', (data: { chatId: string }) => {
      const { chatId } = data;
      if (!chatId) return;

      socket.to(`chat:${chatId}`).emit('user:typing', {
        userId,
        chatId,
        isTyping: false,
      });
    });
  }

  private setupDisconnectHandler(socket: Socket): void {
    const userId = (socket.data as SocketData).userId;

    socket.on('disconnect', async reason => {
      try {
        // Unregister socket
        this.unregisterUserSocket(userId, socket.id);

        logger.info(
          `👤 User ${userId} disconnected from Socket.io (socket: ${socket.id}, reason: ${reason})`
        );

        // If user has no more active sockets, mark as offline
        const userSocketSet = this.userSockets.get(userId);
        if (!userSocketSet || userSocketSet.size === 0) {
          await this.updateUserOfflineStatus(userId);
          await this.broadcastUserOfflineStatus(userId);
          logger.info(`👤 User ${userId} marked as offline`);
        }
      } catch (error) {
        logger.error('Error handling socket disconnect:', error);
      }
    });
  }

  // Public methods for broadcasting events

  public broadcastNewMessage(messageData: NewMessageData): void {
    this.io.to(`chat:${messageData.chatId}`).emit('message:new', {
      type: 'message:new',
      data: messageData,
    });
  }

  public broadcastDeletedMessage(messageData: DeletedMessageData): void {
    this.io.to(`chat:${messageData.chatId}`).emit('message:deleted', {
      type: 'message:deleted',
      data: messageData,
    });
  }

  public broadcastEditedMessage(messageData: EditedMessageData): void {
    this.io.to(`chat:${messageData.chatId}`).emit('message:edited', {
      type: 'message:edited',
      data: messageData,
    });
  }

  // Method to manually emit online status (useful for testing or manual status updates)
  public async emitUserOnlineStatus(userId: string): Promise<void> {
    await this.broadcastUserOnlineStatus(userId);
  }

  public async emitUserOfflineStatus(userId: string): Promise<void> {
    await this.broadcastUserOfflineStatus(userId);
  }
}

// Setup function to be called from index.ts
export const setupSocket = (
  io: Server,
  redisClient: Redis | null = null
): SocketHandler => {
  const socketHandler = new SocketHandler(io, redisClient);

  logger.info('🔌 Socket.io handler initialized');
  return socketHandler;
};

export default SocketHandler;
