import axios from 'axios';
import type { Stats, User, Chat, Feedback, LoginCredentials } from '../types';

const api = axios.create({
  baseURL: '/api/admin',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const adminApi = {
  login: (credentials: LoginCredentials) =>
    api.post<{ token: string }>('/auth/login', credentials),
  
  getStats: () => api.get<Stats>('/stats'),
  getUsers: () => api.get<User[]>('/users'),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getChats: () => api.get<Chat[]>('/chats'),
  getFeedback: () => api.get<Feedback[]>('/feedback'),
};