export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Stats {
  totalUsers: number;
  activeChats: number;
  totalMessages: number;
  newFeedback: number;
}

export interface User {
  _id: string;
  email: string;
  username: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Chat {
  _id: string;
  participants: string[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  _id: string;
  userId: string;
  message: string;
  createdAt: string;
  resolved: boolean;
}