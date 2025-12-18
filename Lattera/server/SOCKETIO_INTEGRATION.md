# Socket.io Real-time Integration Documentation

## Overview

This document describes the Socket.io real-time messaging implementation for the Lettera application. The system provides WebSocket support for instant messaging, user status updates, and typing indicators.

## Features Implemented

### ✅ Core Socket.io Features
- **JWT Authentication**: Secure WebSocket connections with token verification
- **Room Management**: Automatic joining of user-specific and chat-specific rooms
- **Real-time Messaging**: Instant message broadcasting to chat participants
- **User Status Updates**: Online/offline status tracking and broadcasting
- **Typing Indicators**: Real-time typing status with auto-throttling
- **Redis Adapter**: Horizontal scaling support with pub/sub

### ✅ Message Events
- `message:new` - Broadcasts when a new message is sent
- `message:deleted` - Broadcasts when a message is deleted for all users
- `message:edited` - Broadcasts when a message is edited

### ✅ User Status Events
- `user:online` - Broadcasts when user connects
- `user:offline` - Broadcasts when user disconnects
- `user:typing` - Broadcasts typing status to other users in chat
- `user:stop-typing` - Broadcasts when user stops typing

## Architecture

### File Structure
```
server/src/
├── websocket/
│   ├── socketHandler.ts       # Core Socket.io implementation
│   └── socketTest.ts          # Integration tests
├── utils/
│   └── socketManager.ts       # Global socket handler registry
└── types/
    ├── socket.d.ts            # Type definitions for Socket.io
    └── socketEvents.ts        # Event type definitions
```

### Components

#### 1. SocketHandler Class
- Manages all Socket.io connections and events
- Handles authentication via JWT tokens
- Manages room subscriptions and user socket tracking
- Provides broadcasting methods for different event types
- Integrates with Redis adapter for horizontal scaling

#### 2. SocketManager
- Global registry for the SocketHandler instance
- Allows other parts of the application to access socket broadcasting
- Used by API routes to emit real-time events

#### 3. Event Types
- Comprehensive TypeScript interfaces for all events
- Client-to-server and server-to-client event definitions
- Proper type safety for socket communication

## Integration Points

### HTTP API Integration
The Socket.io integration is automatically enabled when the Express server starts:

```typescript
// In src/index.ts
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6, // 1MB for file uploads
});

const socketHandler = setupSocket(io, redisClient);
setSocketHandler(socketHandler);
```

### Message Routes Integration
Message routes automatically broadcast events when messages are created, edited, or deleted:

```typescript
// In src/routes/messages.ts
const socketHandler = getSocketHandler();
if (socketHandler) {
  socketHandler.broadcastNewMessage({
    messageId: newMessage._id.toString(),
    chatId: newMessage.chatId.toString(),
    senderId: newMessage.senderId.toString(),
    content: newMessage.content,
    timestamp: newMessage.timestamp.toISOString(),
  });
}
```

## Client Connection

### Authentication
Clients must authenticate by sending their JWT token:

```javascript
// Via query parameter
const socket = io(serverUrl, {
  query: {
    token: jwtToken
  }
});

// Via auth header
const socket = io(serverUrl, {
  auth: {
    token: jwtToken
  }
});
```

### Event Handling
Clients listen for events and handle them appropriately:

```javascript
socket.on('message:new', (event) => {
  console.log('New message:', event.data);
  // Update UI with new message
});

socket.on('user:online', (event) => {
  console.log('User online:', event.data.userId);
  // Update user's online status in UI
});

socket.on('user:typing', (event) => {
  if (event.data.isTyping) {
    showTypingIndicator(event.data.userId);
  } else {
    hideTypingIndicator(event.data.userId);
  }
});
```

### Sending Events
Clients can emit typing events:

```javascript
// Start typing
socket.emit('user:typing', { chatId: chatId });

// Stop typing
socket.emit('user:stop-typing', { chatId: chatId });
```

## Room Management

### Automatic Room Joining
- **User Room**: `user:${userId}` - Direct messages to user
- **Chat Room**: `chat:${chatId}` - All messages in chat

### Room Behavior
- Users automatically join their personal room and all chat rooms on connection
- Users leave rooms automatically on disconnect
- Redis adapter ensures room events are broadcast across all server instances

## Redis Integration

### Horizontal Scaling
The Redis adapter enables:
- Cross-server room broadcasting
- Load balancing across multiple server instances
- Session persistence during server restarts
- Automatic reconnection and room rejoin

### Configuration
```typescript
// Redis adapter is automatically configured if Redis is available
const redisClient = getRedis();
const socketHandler = setupSocket(io, redisClient);
```

## Error Handling

### Authentication Errors
- Invalid JWT tokens result in immediate disconnection
- Missing tokens result in connection rejection with error message
- All authentication errors are logged for security monitoring

### Connection Errors
- Socket.io automatically handles reconnection
- Graceful fallback when Redis is unavailable
- Comprehensive error logging for debugging

## Security Considerations

### ✅ Authentication
- JWT tokens are required for all WebSocket connections
- Tokens are verified before socket connection is established
- Invalid tokens result in immediate disconnection

### ✅ Authorization
- Users can only access chats they are participants of
- Room subscriptions are automatically managed based on chat participation
- No unauthorized access to other users' chats or messages

### ✅ Data Privacy
- Messages are only broadcast to chat participants
- User status updates are only sent to relevant users
- No sensitive data exposed in socket events

## Testing

### Socket.io Integration Tests
Run the integration tests:

```bash
cd server
npm run test-socket
```

### Manual Testing
1. Start the server: `npm run dev`
2. Connect a WebSocket client with valid JWT token
3. Send messages, edit messages, and delete messages
4. Monitor console logs for real-time events
5. Verify typing indicators work correctly
6. Test user online/offline status updates

## Performance

### Optimization Features
- **Efficient Broadcasting**: Events are only sent to relevant users/rooms
- **Typing Throttling**: Auto-stop typing indicators after 3 seconds
- **Connection Management**: Proper cleanup on disconnect
- **Memory Management**: Automatic removal of closed socket connections

### Monitoring
- All socket events are logged for debugging
- Connection/disconnection events are tracked
- Error events are logged for monitoring

## Environment Variables

### Required
- `JWT_ACCESS_SECRET`: Secret key for JWT token verification
- `FRONTEND_URL`: Allowed origin for CORS (optional, defaults to true)

### Optional
- `REDIS_URL`: Redis connection for horizontal scaling
- `PORT`: Server port (defaults to 3000)

## Troubleshooting

### Common Issues
1. **Connection Failed**: Check JWT token validity and expiration
2. **Events Not Received**: Verify user is participant in the chat
3. **Redis Errors**: Redis is optional, system works without it
4. **CORS Issues**: Check FRONTEND_URL environment variable

### Debug Logging
Socket events are logged with:
- Connection/disconnection events
- Authentication failures
- Room join/leave events
- Broadcasting activity
- Error conditions

## Future Enhancements

### Potential Additions
- Message read receipts with `message:read` events
- File upload progress via WebSocket
- Voice/video call signaling
- Message search and filtering
- Push notifications for offline users
- User presence indicators (away, busy, etc.)

This Socket.io integration provides a solid foundation for real-time messaging in the Lettera application while maintaining security, performance, and scalability.