import { apiClient, request, tokenStorage } from "../utils/apiClient";

import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  CreateChatRequest,
  CreateChatResponse,
  DeleteMediaResponse,
  DeleteMessageResponse,
  EditMessageRequest,
  EditMessageResponse,
  GetChatResponse,
  GetChatsResponse,
  GetDatabaseHealthResponse,
  GetHealthResponse,
  GetMessagesResponse,
  GetPresignedMediaResponse,
  GetRedisHealthResponse,
  GetUserMediaFilesResponse,
  GetUserMediaStatsResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RegisterRequest,
  RegisterResponse,
  SearchUsersRequest,
  SearchUsersResponse,
  SendMessageRequest,
  SendMessageResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UploadMediaRequest,
  UploadMediaResponse,
  UserResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from "../types/api";

const storeAuthTokens = (accessToken: string, refreshToken?: string): void => {
  tokenStorage.setAccessToken(accessToken);
  if (refreshToken) tokenStorage.setRefreshToken(refreshToken);
};

export const api = {
  auth: {
    register(payload: RegisterRequest): Promise<RegisterResponse> {
      return request<RegisterResponse>({
        method: "POST",
        url: "/auth/register",
        data: payload,
      });
    },

    async verifyEmail(
      payload: VerifyEmailRequest,
    ): Promise<VerifyEmailResponse> {
      const response = await request<VerifyEmailResponse>({
        method: "POST",
        url: "/auth/verify-email",
        data: payload,
      });

      storeAuthTokens(response.accessToken, response.refreshToken);
      return response;
    },

    async login(payload: LoginRequest): Promise<LoginResponse> {
      const response = await request<LoginResponse>({
        method: "POST",
        url: "/auth/login",
        data: payload,
      });

      storeAuthTokens(response.accessToken, response.refreshToken);
      return response;
    },

    async logout(): Promise<LogoutResponse> {
      const response = await request<LogoutResponse>({
        method: "POST",
        url: "/auth/logout",
      });

      tokenStorage.clearTokens();
      return response;
    },

    clearSession(): void {
      tokenStorage.clearTokens();
    },
  },

  users: {
    me(): Promise<UserResponse> {
      return request<UserResponse>({ method: "GET", url: "/users/me" });
    },

    updateMe(payload: UpdateProfileRequest): Promise<UpdateProfileResponse> {
      return request<UpdateProfileResponse>({
        method: "PATCH",
        url: "/users/me",
        data: payload,
      });
    },

    changePassword(
      payload: ChangePasswordRequest,
    ): Promise<ChangePasswordResponse> {
      return request<ChangePasswordResponse>({
        method: "PATCH",
        url: "/users/me/password",
        data: payload,
      }).then((response) => {
        if (response.accessToken) {
          storeAuthTokens(response.accessToken, response.refreshToken);
        }

        return response;
      });
    },

    searchUsers(params: SearchUsersRequest): Promise<SearchUsersResponse> {
      const query: Record<string, string | number | undefined> = {
        category: params.category,
        company: params.company,
        search: params.search,
        limit: params.limit,
        offset: params.offset,
      };

      if (params.skills && params.skills.length > 0) {
        query.skills = params.skills.join(",");
      }

      return request<SearchUsersResponse>({
        method: "GET",
        url: "/users/search",
        params: query,
      });
    },
  },

  chats: {
    create(payload: CreateChatRequest): Promise<CreateChatResponse> {
      return request<CreateChatResponse>({
        method: "POST",
        url: "/chats",
        data: payload,
      });
    },

    list(params?: {
      limit?: number;
      offset?: number;
    }): Promise<GetChatsResponse> {
      return request<GetChatsResponse>({
        method: "GET",
        url: "/chats",
        params: params || {},
      });
    },

    get(chatId: string): Promise<GetChatResponse> {
      return request<GetChatResponse>({
        method: "GET",
        url: `/chats/${chatId}`,
      });
    },
  },

  messages: {
    send(payload: SendMessageRequest): Promise<SendMessageResponse> {
      return request<SendMessageResponse>({
        method: "POST",
        url: "/messages",
        data: payload,
      });
    },

    list(params: {
      chatId: string;
      limit?: number;
      offset?: number;
    }): Promise<GetMessagesResponse> {
      return request<GetMessagesResponse>({
        method: "GET",
        url: "/messages",
        params,
      });
    },

    edit(
      messageId: string,
      payload: EditMessageRequest,
    ): Promise<EditMessageResponse> {
      return request<EditMessageResponse>({
        method: "PATCH",
        url: `/messages/${messageId}`,
        data: payload,
      });
    },

    delete(
      messageId: string,
      params?: { forAll?: boolean },
    ): Promise<DeleteMessageResponse> {
      return request<DeleteMessageResponse>({
        method: "DELETE",
        url: `/messages/${messageId}`,
        params:
          params?.forAll === undefined ? undefined : { forAll: params.forAll },
      });
    },
  },

  media: {
    async upload(payload: UploadMediaRequest): Promise<UploadMediaResponse> {
      const formData = new FormData();
      formData.append("file", payload.file);
      formData.append("userId", payload.userId);

      return request<UploadMediaResponse>({
        method: "POST",
        url: "/media/upload",
        data: formData,
      });
    },

    deleteByUrl(
      fileUrl: string,
      payload?: { userId?: string },
    ): Promise<DeleteMediaResponse> {
      const encodedUrl = encodeURIComponent(fileUrl);

      return request<DeleteMediaResponse>({
        method: "DELETE",
        url: `/media/${encodedUrl}`,
        data: payload,
      });
    },

    presigned(
      key: string,
      expiresIn?: number,
    ): Promise<GetPresignedMediaResponse> {
      return request<GetPresignedMediaResponse>({
        method: "GET",
        url: `/media/presigned/${encodeURIComponent(key)}`,
        params: expiresIn === undefined ? undefined : { expiresIn },
      });
    },

    userStats(userId: string): Promise<GetUserMediaStatsResponse> {
      return request<GetUserMediaStatsResponse>({
        method: "GET",
        url: `/media/user/${userId}/stats`,
      });
    },

    userFiles(params: {
      userId: string;
      page?: number;
      limit?: number;
      type?: "image" | "audio" | "video";
    }): Promise<GetUserMediaFilesResponse> {
      const { userId, ...query } = params;

      return request<GetUserMediaFilesResponse>({
        method: "GET",
        url: `/media/user/${userId}/files`,
        params: query,
      });
    },
  },

  health: {
    get(): Promise<GetHealthResponse> {
      return request<GetHealthResponse>({ method: "GET", url: "/health" });
    },

    db(): Promise<GetDatabaseHealthResponse> {
      return request<GetDatabaseHealthResponse>({
        method: "GET",
        url: "/health/db",
      });
    },

    redis(): Promise<GetRedisHealthResponse> {
      return request<GetRedisHealthResponse>({
        method: "GET",
        url: "/health/redis",
      });
    },
  },
};

export { apiClient };
