import { api } from '../../services/api';
import { request } from '../../utils/apiClient';
import type {
  CreateChatResponse,
  GetChatsResponse,
  GetChatResponse,
  MarkChatAsReadResponse,
} from '../../types/api';
import { ApiError } from '../../utils/apiClient';

// Mock the request function
jest.mock('../../utils/apiClient', () => {
  const actual = jest.requireActual('../../utils/apiClient');
  return {
    ...actual,
    request: jest.fn(),
    apiClient: {
      request: jest.fn(),
    },
  };
});

describe('Chat Service', () => {
  const mockRequest = request as jest.MockedFunction<typeof request>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChat', () => {
    it('should successfully create a new chat', async () => {
      const mockResponse: CreateChatResponse = {
        message: 'Chat created successfully',
        chat: {
          id: 'chat-123',
          participants: [
            {
              id: 'user-456',
              firstName: 'John',
              lastName: 'Owner',
              avatarUrl: 'https://example.com/avatar.jpg',
              profile: {
                position: 'Manager',
                company: 'Company A',
                category: 'IT' as const,
                skills: [],
              },
            },
            {
              id: 'user-789',
              firstName: 'Jane',
              lastName: 'Member',
              avatarUrl: 'https://example.com/avatar2.jpg',
              profile: {
                position: 'Developer',
                company: 'Company A',
                category: 'IT' as const,
                skills: [],
              },
            },
          ],
          type: 'group' as const,
          lastMessage: null,
          unreadCount: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const payload = {
        participantIds: ['user-456', 'user-789'],
      };

      const result = await api.chats.create(payload);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/chats',
        data: payload,
      });
      expect(result).toEqual(mockResponse);
      expect(result.chat.id).toBe('chat-123');
      expect(result.chat.type).toBe('group');
    });

    it('should create a direct chat with single participant', async () => {
      const mockResponse: CreateChatResponse = {
        id: 'chat-direct-123',
        name: null,
        ownerId: 'user-456',
        participants: ['user-456', 'user-789'],
        type: 'direct',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const payload = {
        participantIds: ['user-789'],
      };

      const result = await api.chats.create(payload);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/chats',
        data: payload,
      });
      expect(result.type).toBe('direct');
    });

    it('should handle unauthorized access', async () => {
      const mockError = new ApiError('Unauthorized', {
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        name: 'Secret Chat',
        participantIds: ['user-123'],
      };

      await expect(api.chats.create(payload)).rejects.toThrow('Unauthorized');
    });

    it('should handle forbidden access', async () => {
      const mockError = new ApiError('Forbidden', {
        statusCode: 403,
        code: 'FORBIDDEN',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        name: 'Restricted Chat',
        participantIds: ['user-123'],
      };

      await expect(api.chats.create(payload)).rejects.toThrow('Forbidden');
    });

    it('should handle validation error', async () => {
      const mockError = new ApiError('Invalid participants', {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        name: 'Bad Chat',
        participantIds: [],
      };

      await expect(api.chats.create(payload)).rejects.toThrow('Invalid participants');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        name: 'Network Test Chat',
        participantIds: ['user-123'],
      };

      await expect(api.chats.create(payload)).rejects.toThrow('Unexpected error');
    });
  });

  describe('getChats', () => {
    it('should retrieve chats with default pagination', async () => {
      const mockResponse: GetChatsResponse = {
        data: [
          {
            id: 'chat-1',
            name: 'Team Chat',
            ownerId: 'user-123',
            participants: ['user-123', 'user-456'],
            type: 'group',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastMessage: 'Hello team',
            unreadCount: 2,
          },
          {
            id: 'chat-2',
            name: null,
            ownerId: 'user-123',
            participants: ['user-123', 'user-789'],
            type: 'direct',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastMessage: 'Hi there',
            unreadCount: 0,
          },
        ],
        total: 2,
        limit: 20,
        offset: 0,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.chats.list();

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/chats',
        params: {},
      });
      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should retrieve chats with custom pagination', async () => {
      const mockResponse: GetChatsResponse = {
        data: [
          {
            id: 'chat-3',
            name: 'Third Chat',
            ownerId: 'user-123',
            participants: ['user-123', 'user-999'],
            type: 'group',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastMessage: null,
            unreadCount: 5,
          },
        ],
        total: 15,
        limit: 10,
        offset: 20,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const pagination = {
        limit: 10,
        offset: 20,
      };

      const result = await api.chats.list(pagination);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/chats',
        params: pagination,
      });
      expect(result).toEqual(mockResponse);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
    });

    it('should handle empty chat list', async () => {
      const mockResponse: GetChatsResponse = {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.chats.list();

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle large pagination offsets', async () => {
      const mockResponse: GetChatsResponse = {
        data: [],
        total: 5,
        limit: 10,
        offset: 100,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const pagination = {
        limit: 10,
        offset: 100,
      };

      const result = await api.chats.list(pagination);

      expect(result.offset).toBe(100);
      expect(result.data).toHaveLength(0);
    });

    it('should handle missing required fields gracefully', async () => {
      const partialResponse = {
        data: [
          {
            id: 'chat-1',
            type: 'direct',
          },
        ],
        total: 1,
      };

      mockRequest.mockResolvedValueOnce(partialResponse);

      const result = await api.chats.list();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should handle unauthorized access', async () => {
      const mockError = new ApiError('Unauthorized', {
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.chats.list()).rejects.toThrow('Unauthorized');
    });

    it('should handle server error', async () => {
      const mockError = new ApiError('Internal server error', {
        statusCode: 500,
        code: 'SERVER_ERROR',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.chats.list()).rejects.toThrow('Internal server error');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.chats.list()).rejects.toThrow('Unexpected error');
    });
  });

  describe('getChat', () => {
    it('should successfully retrieve a specific chat', async () => {
      const mockResponse: GetChatResponse = {
        id: 'chat-123',
        name: 'Project Discussion',
        ownerId: 'user-456',
        participants: [
          {
            id: 'user-456',
            email: 'owner@example.com',
            firstName: 'John',
            lastName: 'Owner',
            profile: {
              position: 'Manager',
              company: 'Company A',
              category: 'IT',
              skills: ['management'],
            },
          },
          {
            id: 'user-789',
            email: 'member@example.com',
            firstName: 'Jane',
            lastName: 'Member',
            profile: {
              position: 'Developer',
              company: 'Company A',
              category: 'IT',
              skills: ['javascript'],
            },
          },
        ],
        type: 'group',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastReadAt: null,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const chatId = 'chat-123';
      const result = await api.chats.get(chatId);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: `/chats/${chatId}`,
      });
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe(chatId);
      expect(result.participants).toHaveLength(2);
    });

    it('should handle chat not found', async () => {
      const mockError = new ApiError('Chat not found', {
        statusCode: 404,
        code: 'CHAT_NOT_FOUND',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const chatId = 'non-existent-chat';

      await expect(api.chats.get(chatId)).rejects.toThrow('Chat not found');
    });

    it('should handle access denied to chat', async () => {
      const mockError = new ApiError('Access denied to this chat', {
        statusCode: 403,
        code: 'CHAT_ACCESS_DENIED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const chatId = 'restricted-chat';

      await expect(api.chats.get(chatId)).rejects.toThrow('Access denied to this chat');
    });

    it('should handle invalid chat ID', async () => {
      const mockError = new ApiError('Invalid chat ID format', {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const invalidChatId = 'invalid-id-format!';

      await expect(api.chats.get(invalidChatId)).rejects.toThrow('Invalid chat ID format');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const chatId = 'chat-123';

      await expect(api.chats.get(chatId)).rejects.toThrow('Unexpected error');
    });

    it('should verify chat access control for different user', async () => {
      const mockResponse: GetChatResponse = {
        id: 'chat-123',
        name: 'Restricted Chat',
        ownerId: 'user-999',
        participants: [
          {
            id: 'current-user',
            email: 'current@example.com',
            firstName: 'Current',
            lastName: 'User',
            profile: {
              position: 'Developer',
              company: 'Company B',
              category: 'IT',
              skills: ['typescript'],
            },
          },
        ],
        type: 'group',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastReadAt: null,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.chats.get('chat-123');

      // Verify current user is in participants list
      const currentUser = result.participants.find(p => p.id === 'current-user');
      expect(currentUser).toBeDefined();
      expect(result.ownerId).toBe('user-999');
    });
  });

  describe('markAsRead', () => {
    it('should successfully mark chat as read', async () => {
      const mockResponse: MarkChatAsReadResponse = {
        success: true,
        lastReadAt: new Date().toISOString(),
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const chatId = 'chat-123';
      const result = await api.chats.markAsRead(chatId);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: `/chats/${chatId}/read`,
      });
      expect(result.success).toBe(true);
      expect(result.lastReadAt).toBeDefined();
    });

    it('should handle marking non-existent chat as read', async () => {
      const mockError = new ApiError('Chat not found', {
        statusCode: 404,
        code: 'CHAT_NOT_FOUND',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const chatId = 'non-existent-chat';

      await expect(api.chats.markAsRead(chatId)).rejects.toThrow('Chat not found');
    });

    it('should handle access denied when marking as read', async () => {
      const mockError = new ApiError('Access denied', {
        statusCode: 403,
        code: 'CHAT_ACCESS_DENIED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const chatId = 'restricted-chat';

      await expect(api.chats.markAsRead(chatId)).rejects.toThrow('Access denied');
    });

    it('should handle server error', async () => {
      const mockError = new ApiError('Internal server error', {
        statusCode: 500,
        code: 'SERVER_ERROR',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const chatId = 'chat-123';

      await expect(api.chats.markAsRead(chatId)).rejects.toThrow('Internal server error');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const chatId = 'chat-123';

      await expect(api.chats.markAsRead(chatId)).rejects.toThrow('Unexpected error');
    });
  });
});