import { api } from '../../services/api';
import { request, tokenStorage } from '../../utils/apiClient';
import { ApiError } from '../../utils/apiClient';
import type {
  RegisterResponse,
  LoginResponse,
  VerifyEmailResponse,
  LogoutResponse,
} from '../../types/api';

// Mock the request function and tokenStorage
jest.mock('../../utils/apiClient', () => {
  const actual = jest.requireActual('../../utils/apiClient');
  return {
    ...actual,
    request: jest.fn(),
    tokenStorage: {
      setAccessToken: jest.fn(),
      setRefreshToken: jest.fn(),
      clearTokens: jest.fn(),
      getAccessToken: jest.fn(() => 'mock-token'),
      getRefreshToken: jest.fn(() => 'mock-refresh-token'),
    },
  };
});

describe('Auth Service', () => {
  const mockRequest = request as jest.MockedFunction<typeof request>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockResponse: RegisterResponse = {
        message: 'User registered successfully',
        email: 'test@example.com',
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const payload = {
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: '',
        skills: [],
        position: 'Developer',
        company: 'Test Corp',
        category: 'IT' as const,
      };

      const result = await api.auth.register(payload);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/auth/register',
        data: payload,
      });
      expect(result).toEqual(mockResponse);
      expect(result.email).toBe('test@example.com');
    });

    it('should handle email already exists error', async () => {
      const mockError = new ApiError('Email already exists', {
        statusCode: 409,
        code: 'EMAIL_EXISTS',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        email: 'existing@example.com',
        password: 'securePassword123',
        firstName: 'Jane',
        lastName: 'Smith',
        avatarUrl: '',
        skills: [],
        position: 'Designer',
        company: 'Design Studio',
        category: 'Design' as const,
      };

      await expect(api.auth.register(payload)).rejects.toThrow('Email already exists');
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/auth/register',
        data: payload,
      });
    });

    it('should handle validation error', async () => {
      const mockError = new ApiError('Invalid email format', {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const invalidPayload = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
        avatarUrl: '',
        skills: [],
        position: '',
        company: '',
        category: 'Other' as const,
      };

      await expect(api.auth.register(invalidPayload)).rejects.toThrow('Invalid email format');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: '',
        skills: [],
        position: 'Developer',
        company: 'Test Corp',
        category: 'IT' as const,
      };

      await expect(api.auth.register(payload)).rejects.toThrow('Unexpected error');
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email and store tokens', async () => {
      const mockResponse: VerifyEmailResponse = {
        message: 'Email verified successfully',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const payload = {
        email: 'test@example.com',
        code: '123456',
      };

      const result = await api.auth.verifyEmail(payload);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/auth/verify-email',
        data: payload,
      });
      expect(tokenStorage.setAccessToken).toHaveBeenCalledWith('access-token-123');
      expect(tokenStorage.setRefreshToken).toHaveBeenCalledWith('refresh-token-123');
      expect(result.accessToken).toBe('access-token-123');
    });

    it('should handle invalid verification code', async () => {
      const mockError = new ApiError('Invalid verification code', {
        statusCode: 400,
        code: 'INVALID_VERIFICATION_CODE',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        email: 'test@example.com',
        code: '999999',
      };

      await expect(api.auth.verifyEmail(payload)).rejects.toThrow('Invalid verification code');
      expect(tokenStorage.setAccessToken).not.toHaveBeenCalled();
      expect(tokenStorage.setRefreshToken).not.toHaveBeenCalled();
    });

    it('should handle expired verification code', async () => {
      const mockError = new ApiError('Verification code has expired', {
        statusCode: 410,
        code: 'VERIFICATION_CODE_EXPIRED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        email: 'test@example.com',
        code: '123456',
      };

      await expect(api.auth.verifyEmail(payload)).rejects.toThrow('Verification code has expired');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        email: 'test@example.com',
        code: '123456',
      };

      await expect(api.auth.verifyEmail(payload)).rejects.toThrow('Unexpected error');
    });
  });

  describe('login', () => {
    it('should successfully login and store tokens', async () => {
      const mockResponse: LoginResponse = {
        message: 'Login successful',
        accessToken: 'access-token-456',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          profile: {
            position: 'Developer',
            company: 'Test Corp',
            category: 'IT',
            skills: [],
          },
        },
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const payload = {
        email: 'test@example.com',
        password: 'securePassword123',
      };

      const result = await api.auth.login(payload);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/auth/login',
        data: payload,
      });
      expect(tokenStorage.setAccessToken).toHaveBeenCalledWith('access-token-456');
      expect(tokenStorage.setRefreshToken).toHaveBeenCalledWith('refresh-token-456');
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle incorrect credentials', async () => {
      const mockError = new ApiError('Email or password is incorrect', {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      };

      await expect(api.auth.login(payload)).rejects.toThrow('Email or password is incorrect');
      expect(tokenStorage.setAccessToken).not.toHaveBeenCalled();
      expect(tokenStorage.setRefreshToken).not.toHaveBeenCalled();
    });

    it('should handle unverified email', async () => {
      const mockError = new ApiError('Please verify your email first', {
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        email: 'unverified@example.com',
        password: 'password123',
      };

      await expect(api.auth.login(payload)).rejects.toThrow('Please verify your email first');
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      const payload = {
        email: 'test@example.com',
        password: 'securePassword123',
      };

      await expect(api.auth.login(payload)).rejects.toThrow('Unexpected error');
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear tokens', async () => {
      const mockResponse: LogoutResponse = {
        message: 'Successfully logged out',
      };

      mockRequest.mockResolvedValueOnce(mockResponse);

      const result = await api.auth.logout();

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/auth/logout',
      });
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.message).toBe('Successfully logged out');
    });

    it('should clear tokens even if API call fails', async () => {
      const mockError = new ApiError('Internal server error', {
        statusCode: 500,
        code: 'SERVER_ERROR',
      });

      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.auth.logout()).rejects.toThrow('Internal server error');
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should handle network error during logout', async () => {
      const mockError = new Error('Network error');
      mockRequest.mockRejectedValueOnce(mockError);

      await expect(api.auth.logout()).rejects.toThrow('Unexpected error');
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });

  describe('clearSession', () => {
    it('should clear tokens from storage', () => {
      api.auth.clearSession();

      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });

    it('should not throw when clearing session', () => {
      expect(() => api.auth.clearSession()).not.toThrow();
      expect(tokenStorage.clearTokens).toHaveBeenCalled();
    });
  });
});