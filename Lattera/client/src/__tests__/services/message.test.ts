import { api } from '../../services/api';
import { request, tokenStorage } from '../../utils/apiClient';
import type {
  SendMessageResponse,
  GetMessagesResponse,
  EditMessageResponse,
  DeleteMessageResponse,
  UpdateMessageFlags,
} from '../../types/api';
import { ApiError } from '../../utils/apiClient';

// Mock the request function and tokenStorage
jest.mock('../../utils/apiClient', () => {
  const actual = jest.requireActual('../../utils/apiClient');
  return {
    ...actual,
    request: jest.fn(),
    tokenStorage: {
      getAccessToken: jest.fn(() => 'mock-access-token'),
    },
  };
});

describe('Message Service', () => {
  const mockRequest = request as jest.MockedFunction<typeof request>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should successfully send a text message', async () => {
      const mockResponse: SendMessageResponse = {
        id: 'msg-123',
        senderId: 'user-456',
        chatId: 'chat-789',
        type: 'text',
        content: 'Hello world',
          fileUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: null,
          readBy: [],
          isRead: false,
          isEdited: false,
          isDeleted: false,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const payload = {
        chatId: 'chat-789',
        type: 'text' as const,
        content: 'Hello world',
        fileUrl: null,
      };

      const result = await api.messages.send(payload);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/messages',
        data: payload,
      });
      expect(result).toEqual(mockResponse);
      expect(result.id).toBe('msg-123');
      expect(result.content).toBe('Hello world');
      expect(result.readBy).toEqual([]);
    });

    it('should successfully send a message with file', async () => {
      const mockResponse: SendMessageResponse = {
        id: 'msg-456',
        senderId: 'user-456',
        chatId: 'chat-789',
        type: 'file',
        content: 'Check out this file',
          fileUrl: 'https://example.com/file.pdf',
          createdAt: new Date().toISOString(),
          updatedAt: null,
          readBy: [],
          isRead: false,
          isEdited: false,
          isDeleted: false,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const payload = {
        chatId: 'chat-789',
        type: 'file' as const,
        content: 'Check out this file',
        fileUrl: 'https://example.com/file.pdf',
      };

      const result = await api.messages.send(payload);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/messages',
        data: payload,
      });
      expect(result.type).toBe('file');
      expect(result.fileUrl).toBe('https://example.com/file.pdf');
    });

    it('should handle missing required fields', async () => {
      const mockError = new ApiError('Missing required fields: chatId, senderId, content', {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        chatId: '',
        type: 'text' as const,
        content: '',
        fileUrl: null,
      };

      await expect(api.messages.send(payload)).rejects.toThrow('Missing required fields');
    });

    it('should handle unauthorized access', async () => {
      const mockError = new ApiError('Unauthorized', {
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        chatId: 'chat-789',
        type: 'text' as const,
        content: 'Test message',
        fileUrl: null,
      };

      await expect(api.messages.send(payload)).rejects.toThrow('Unauthorized');
    });

    it('should handle chat not found', async () => {
      const mockError = new ApiError('Chat not found', {
        statusCode: 404,
        code: 'CHAT_NOT_FOUND',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        chatId: 'non-existent-chat',
        type: 'text' as const,
        content: 'Test message',
        fileUrl: null,
      };

      await expect(api.messages.send(payload)).rejects.toThrow('Chat not found');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        chatId: 'chat-789',
        type: 'text' as const,
        content: 'Test message',
        fileUrl: null,
      };

      await expect(api.messages.send(payload)).rejects.toThrow('Unexpected error');
    });
  });

  describe('listMessages', () => {
    it('should successfully list messages with default parameters', async () => {
      const mockResponse: GetMessagesResponse = {
        data: [
          {
            id: 'msg-1',
            senderId: 'user-456',
            chatId: 'chat-789',
            type: 'text',
            content: 'First message',
              fileUrl: null,
              createdAt: new Date().toISOString(),
              updatedAt: null,
              readBy: ['user-456'],
              isRead: false,
          },
          {
            id: 'msg-2',
            senderId: 'user-789',
            chatId: 'chat-789',
            type: 'text',
            content: 'Second message',
              fileUrl: null,
              createdAt: new Date().toISOString(),
              updatedAt: null,
              readBy: ['user-456', 'user-789'],
              isRead: true,
          },
        ],
          total: 2,
          limit: 50,
          offset: 0,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const params = {
        chatId: 'chat-789',
      };

      const result = await api.messages.list(params);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/messages',
        params,
      });
      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should list messages with custom pagination and offset', async () => {
      const mockResponse: GetMessagesResponse = {
        data: [
          {
            id: 'msg-3',
            senderId: 'user-456',
            chatId: 'chat-789',
            type: 'text',
            content: 'Older message',
              fileUrl: null,
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              updatedAt: null,
              readBy: ['user-456', 'user-789'],
              isRead: true,
          },
        ],
        total: 25,
        limit: 10,
        offset: 40,
        moreAvailable: true,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const params = {
        chatId: 'chat-789',
        limit: 10,
        offset: 40,
      };

      const result = await api.messages.list(params);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/messages',
        params,
      });
      expect(result.data).toHaveLength(1);
      expect(result.offset).toBe(40);
      expect(result.limit).toBe(10);
    });

    it('should handle empty message list', async () => {
      const mockResponse: GetMessagesResponse = {
        data: [],
        total: 0,
        limit: 50,
        offset: 0,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const params = {
        chatId: 'empty-chat',
      };

      const result = await api.messages.list(params);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle chat not found when listing messages', async () => {
      const mockError = new ApiError('Chat not found', {
        statusCode: 404,
        code: 'CHAT_NOT_FOUND',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const params = {
        chatId: 'non-existent-chat',
      };

      await expect(api.messages.list(params)).rejects.toThrow('Chat not found');
    });

    it('should handle unauthorized access', async () => {
      const mockError = new ApiError('Unauthorized', {
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const params = {
        chatId: 'chat-789',
      };

      await expect(api.messages.list(params)).rejects.toThrow('Unauthorized');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const params = {
        chatId: 'chat-789',
      };

      await expect(api.messages.list(params)).rejects.toThrow('Unexpected error');
    });
  });

  describe('editMessage', () => {
    // Helper to create a base time for tests
    const getBaseDate = () => new Date('2024-01-01T12:00:00Z');

    it('should successfully edit message within 15 minutes', async () => {
      const mockResponse: EditMessageResponse = {
        id: 'msg-123',
        chatId: 'chat-789',
        senderId: 'user-456',
        content: 'Edited message content',
          type: 'text',
          fileUrl: null,
          createdAt: getBaseDate().toISOString(),
          updatedAt: new Date('2024-01-01T12:10:00Z').toISOString(),
          isEdited: true,
          readBy: [],
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const payload = {
        content: 'Edited message content',
      };

      const result = await api.messages.edit('msg-123', payload);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'PATCH',
        url: `/messages/msg-123`,
        data: payload,
      });
      expect(result).toEqual(mockResponse);
      expect(result.isEdited).toBe(true);
      expect(result.updatedAt).toBeDefined();
    });

    it('should handle message not found', async () => {
      const mockError = new ApiError('Message not found', {
        statusCode: 404,
        code: 'MESSAGE_NOT_FOUND',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        content: 'Edited message',
      };

      await expect(api.messages.edit('non-existent-msg', payload)).rejects.toThrow('Message not found');
    });

    it('should handle unauthorized edit attempt', async () => {
      const mockError = new ApiError('You can only edit your own messages', {
        statusCode: 403,
        code: 'MESSAGE_EDIT_FORBIDDEN',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        content: 'Hacked message',
      };

      await expect(
        api.messages.edit('other-users-msg', payload)
      ).rejects.toThrow('You can only edit your own messages');
    });

    it('should handle edit timeout after 15 minutes', async () => {
      const mockError = new ApiError(
        'Message can only be edited within 15 minutes of creation',
        {
          statusCode: 409,
          code: 'EDIT_TIMEOUT',
        }
      );

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        content: 'Too late to edit',
      };

      await expect(api.messages.edit('old-msg', payload)).rejects.toThrow(
        'Message can only be edited within 15 minutes'
      );
    });

    it('should handle validation error', async () => {
      const mockError = new ApiError('Content cannot be empty', {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        content: '',
      };

      await expect(api.messages.edit('msg-123', payload)).rejects.toThrow('Content cannot be empty');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        content: 'Edited message',
      };

      await expect(api.messages.edit('msg-123', payload)).rejects.toThrow('Unexpected error');
    });
  });

  describe('deleteMessage', () => {
    it('should successfully delete message within time limit', async () => {
      const mockResponse: DeleteMessageResponse = {
        id: 'msg-123',
        success: true,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.messages.delete('msg-123');

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        url: `/messages/msg-123`,
        params: undefined,
      });
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.isDeleted).toBe(true);
    });

    it('should successfully mark message as deleted for all', async () => {
      const mockResponse: DeleteMessageResponse = {
        id: 'msg-456',
        success: true,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.messages.delete('msg-456', { forAll: true });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'DELETE',
        url: `/messages/msg-456`,
        params: { forAll: true },
      });
      expect(result.success).toBe(true);
    });

    it('should handle message not found', async () => {
      const mockError = new ApiError('Message not found', {
        statusCode: 404,
        code: 'MESSAGE_NOT_FOUND',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.messages.delete('non-existent-msg')).rejects.toThrow('Message not found');
    });

    it('should handle unauthorized deletion', async () => {
      const mockError = new ApiError('You can only delete your own messages', {
        statusCode: 403,
        code: 'MESSAGE_DELETE_FORBIDDEN',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.messages.delete('other-users-msg')).rejects.toThrow('You can only delete your own messages');
    });

    it('should handle deletion timeout', async () => {
      const mockError = new ApiError(
        'Message can only be deleted within the time limit',
        {
          statusCode: 409,
          code: 'DELETE_TIMEOUT',
        }
      );

      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.messages.delete('old-msg')).rejects.toThrow('Message can only be deleted within the time limit');
    });

    it('should handle deletion for message already deleted', async () => {
      const mockError = new ApiError('Message already deleted', {
        statusCode: 409,
        code: 'MESSAGE_ALREADY_DELETED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.messages.delete('already-deleted-msg')).rejects.toThrow('Message already deleted');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.messages.delete('msg-123')).rejects.toThrow('Unexpected error');
    });

    it('should handle deletion permission checks', async () => {
      const mockResponse: DeleteMessageResponse = {
        id: 'msg-admin',
        success: true,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedByAdmin: true,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.messages.delete('msg-admin');

      expect(result.deletedByAdmin).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  describe('message timestamps validation', () => {
    // Helper function to create timestamps relative to now
    const getTimestamp = (minutesAgo: number) => 
      new Date(Date.now() - minutesAgo * 60000).toISOString();

    it('should verify recent message timestamps for edit permission', async () => {
      const recentTimestamp = getTimestamp(5); // 5 minutes ago
      
      const mockResponse: EditMessageResponse = {
        id: 'msg-recent',
        chatId: 'chat-123',
          senderId: 'user-456',
          content: 'Recently edited',
          type: 'text',
          fileUrl: null,
          createdAt: recentTimestamp,
          updatedAt: new Date().toISOString(),
          isEdited: true,
          readBy: [],
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.messages.edit('msg-recent', { content: 'Recently edited' });

      expect(new Date(result.createdAt).getTime()).toBeLessThan(new Date(result.updatedAt!).getTime());
    });

    it('should verify old message timestamps', async () => {
      const oldTimestamp = getTimestamp(30); // 30 minutes ago
      
      const mockResponse: SendMessageResponse = {
        id: 'msg-old',
          senderId: 'user-456',
          chatId: 'chat-123',
          type: 'text',
          content: 'Old message',
          fileUrl: null,
          createdAt: oldTimestamp,
          updatedAt: null,
          readBy: [],
          isRead: false,
          isEdited: false,
          isDeleted: false,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const params = {
        chatId: 'chat-123',
        limit: 10,
      };

      const result = await api.messages.list(params);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/messages',
        params: { chatId: 'chat-123', limit: 10 },
      });
    });
  });

  describe('message read status', () => {
    it('should properly track message read status', async () => {
      const mockResponse: GetMessagesResponse = {
        data: [
          {
            id: 'msg-read',
            senderId: 'user-456',
            chatId: 'chat-123',
            type: 'text',
            content: 'Read message',
              fileUrl: null,
              createdAt: new Date().toISOString(),
              updatedAt: null,
              readBy: ['user-456', 'user-789'],
              isRead: true,
              isEdited: false,
              isDeleted: false,
          },
          {
            id: 'msg-unread',
            senderId: 'user-789',
            chatId: 'chat-123',
            type: 'text',
            content: 'Unread message',
              fileUrl: null,
              createdAt: new Date().toISOString(),
              updatedAt: null,
              readBy: ['user-789'],
              isRead: false,
              isEdited: false,
              isDeleted: false,
          },
        ],
        total: 2,
        limit: 50,
        offset: 0,
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const params = {
        chatId: 'chat-123',
      };

      const result = await api.messages.list(params);

      const readCount = result.data.filter(msg => msg.isRead).length;
      const unreadCount = result.data.filter(msg => !msg.isRead).length;

      expect(readCount).toBe(1);
      expect(unreadCount).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should accurately track readBy array changes after edit', async () => {
      const mockResponse: EditMessageResponse = {
        id: 'msg-edited',
        chatId: 'chat-123',
        senderId: 'user-456',
          content: 'Edited with more readers',
          type: 'text',
          fileUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEdited: true,
        readBy: ['user-456', 'user-789', 'user-999'], // More users have read after edit
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.messages.edit('msg-edited', { 
        content: 'Edited with more readers' 
      });

      expect(result.readBy.length).toBe(3);
      expect(result.readBy).toContain('user-456');
      expect(result.readBy).toContain('user-789');
      expect(result.readBy).toContain('user-999');
    });
  });
});