/**
 * Socket.io Integration Test
 * Tests the real-time messaging functionality
 */

import { setupSocket } from '../websocket/socketHandler';
import { Server } from 'socket.io';

// Mock setup for testing without actual Redis connection
const mockRedisClient = null;

// Test Socket.io setup
const testSocketIO = () => {
  console.log('🧪 Testing Socket.io Integration...');

  // Create a mock HTTP server-like object
  const mockServer = {
    // Mock server methods that Socket.io expects
  } as any;

  // Create Socket.io server instance
  const io = new Server(mockServer, {
    cors: {
      origin: process.env.FRONTEND_URL || true,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1e6,
  });

  // Initialize Socket.io handler
  const socketHandler = setupSocket(io, mockRedisClient);

  // Test connection event
  io.on('connection', socket => {
    console.log(`🔌 Test socket connected: ${socket.id}`);

    // Test message events
    socket.on('message:test', data => {
      console.log('📨 Test message received:', data);
      socket.emit('message:test:response', { received: true, data });
    });

    socket.on('disconnect', reason => {
      console.log(
        `🔌 Test socket disconnected: ${socket.id}, reason: ${reason}`
      );
    });
  });

  console.log('✅ Socket.io test setup complete');
  return { io, socketHandler };
};

export const testSocketEvents = () => {
  const { socketHandler } = testSocketIO();

  // Test broadcasting functions
  console.log('📡 Testing event broadcasting...');

  // Test new message broadcast
  socketHandler.broadcastNewMessage({
    messageId: 'test-message-id',
    chatId: 'test-chat-id',
    senderId: 'test-user-id',
    content: 'Test message content',
    timestamp: new Date().toISOString(),
  });

  console.log('📡 broadcastNewMessage test sent');

  // Test edited message broadcast
  socketHandler.broadcastEditedMessage({
    messageId: 'test-message-id',
    chatId: 'test-chat-id',
    content: 'Updated test message content',
    editedAt: new Date().toISOString(),
  });

  console.log('📡 broadcastEditedMessage test sent');

  // Test deleted message broadcast
  socketHandler.broadcastDeletedMessage({
    messageId: 'test-message-id',
    chatId: 'test-chat-id',
  });

  console.log('📡 broadcastDeletedMessage test sent');

  console.log('✅ All Socket.io event broadcasting tests completed');
};

export default {
  testSocketIO,
  testSocketEvents,
};
