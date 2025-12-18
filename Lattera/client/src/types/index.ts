export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  position?: string;
  company?: string;
  category?: string;
  skills: string[];
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Chat {
  id: string;
  userId: string;
  user: User;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'read';
}

export interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}
