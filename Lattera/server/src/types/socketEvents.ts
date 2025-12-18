/**
 * Socket.io Event Types and Interfaces
 * Defines the structure for all Socket.io events and data
 */

import { Socket } from 'socket.io';

// Base event structure
export interface BaseEvent {
  type: string;
  data: any;
}

// Message-related events
export interface NewMessageEvent extends BaseEvent {
  type: 'message:new';
  data: {
    messageId: string;
    chatId: string;
    senderId: string;
    content: string;
    timestamp: string;
  };
}

export interface DeletedMessageEvent extends BaseEvent {
  type: 'message:deleted';
  data: {
    messageId: string;
    chatId: string;
  };
}

export interface EditedMessageEvent extends BaseEvent {
  type: 'message:edited';
  data: {
    messageId: string;
    chatId: string;
    content: string;
    editedAt: string;
  };
}

// User status events
export interface UserOnlineEvent extends BaseEvent {
  type: 'user:online';
  data: {
    userId: string;
    status: 'online';
    timestamp: string;
  };
}

export interface UserOfflineEvent extends BaseEvent {
  type: 'user:offline';
  data: {
    userId: string;
    status: 'offline';
    timestamp: string;
  };
}

// Typing events
export interface UserTypingEvent extends BaseEvent {
  type: 'user:typing';
  data: {
    userId: string;
    chatId: string;
    isTyping: boolean;
  };
}

// Socket data interface
export interface SocketData {
  userId: string;
  chatIds: Set<string>;
}

// Incoming client events
export interface ClientToServerEvents {
  'user:typing': (data: { chatId: string }) => void;
  'user:stop-typing': (data: { chatId: string }) => void;
}

// Outgoing server events
export interface ServerToClientEvents {
  'message:new': (event: NewMessageEvent) => void;
  'message:deleted': (event: DeletedMessageEvent) => void;
  'message:edited': (event: EditedMessageEvent) => void;
  'user:online': (event: UserOnlineEvent) => void;
  'user:offline': (event: UserOfflineEvent) => void;
  'user:typing': (event: UserTypingEvent) => void;
  error: (error: { message: string }) => void;
}

// Inter-server events (used with Redis adapter)
export interface InterServerEvents {
  ping: () => void;
  pong: () => void;
}

// Socket instance type
export type SocketInstance = Socket<ClientToServerEvents, ServerToClientEvents>;
