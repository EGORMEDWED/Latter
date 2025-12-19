export type ISODateString = string;

export type ProfileCategory =
  | "IT"
  | "Marketing"
  | "Design"
  | "Finance"
  | "Other";

export interface ApiErrorPayload {
  message: string;
  code: string;
  statusCode: number;
  requestId?: string;
  details?: unknown;
  stack?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export interface UserProfile {
  position: string;
  company: string;
  category: ProfileCategory;
  skills: string[];
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  profile: UserProfile;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export interface UserSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  profile: UserProfile;
}

export interface AuthUserSummary {
  id: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUserSummary;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profile: UserProfile;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  message: string;
  accessToken: string;
}

export interface LogoutResponse {
  message: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  profile?: {
    position?: string;
    company?: string;
    category?: ProfileCategory;
    skills?: string[];
  };
}

export interface UpdateProfileResponse {
  message: string;
  user: UserResponse;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  info: string;
}

export type ChatType = "private" | "group" | string;

export interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  profile: Omit<UserProfile, "skills">;
}

export interface ChatLastMessage {
  content: string;
  senderId: string;
  timestamp: ISODateString;
}

export interface ChatResponseData {
  id: string;
  participants: ChatParticipant[];
  type: ChatType;
  lastMessage: ChatLastMessage | null;
  unreadCount: Record<string, number>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateChatRequest {
  participantIds: string[];
}

export interface CreateChatResponse {
  message: string;
  chat: ChatResponseData;
}

export interface GetChatsResponse {
  message: string;
  total: number;
  count: number;
  limit: number;
  offset: number;
  chats: ChatResponseData[];
}

export interface GetChatResponse {
  message: string;
  chat: ChatResponseData;
}

export interface MarkChatAsReadResponse {
  message: string;
}

export interface MessageMedia {
  type: "image" | "audio" | "video";
  url: string;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
  };
}

export interface SendMessageRequest {
  chatId: string;
  content?: string;
  media?: MessageMedia;
}

export interface MessageSender {
  id: string;
  firstName: string;
  lastName: string;
}

export interface MessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  sender?: MessageSender;
  content: string;
  media: MessageMedia | null;
  editedAt: ISODateString | null;
  deletedFor: string[];
  timestamp: ISODateString;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  deliveredAt?: ISODateString | null;
}

export interface SendMessageResponse {
  message: string;
  data: MessageResponse;
}

export interface MessageWithSenderResponse extends MessageResponse {
  sender: MessageSender;
}

export interface GetMessagesResponse {
  message: string;
  total: number;
  count: number;
  limit: number;
  offset: number;
  messages: MessageWithSenderResponse[];
}

export interface EditMessageRequest {
  content: string;
}

export interface EditMessageResponse {
  message: string;
  data: {
    id: string;
    content: string;
    editedAt: ISODateString;
  };
}

export interface DeleteMessageResponse {
  message: string;
}

export interface SearchUsersRequest {
  category?: ProfileCategory;
  company?: string;
  skills?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface SearchUsersResponse {
  message: string;
  total: number;
  count: number;
  limit: number;
  offset: number;
  users: UserSearchResult[];
}

export type MediaType = "image" | "audio" | "video";

export interface UploadMediaRequest {
  file: File;
  userId: string;
}

export interface MediaResponse {
  url: string;
  key: string;
  type: MediaType;
  size: number;
  mimeType: string;
  uploadedAt: ISODateString;
}

export interface UploadMediaResponse {
  success: true;
  data: MediaResponse;
}

export interface DeleteMediaResponse {
  success: true;
  message: string;
}

export interface GetPresignedMediaResponse {
  success: true;
  data: {
    url: string;
    expiresIn: number;
  };
}

export interface GetUserMediaStatsResponse {
  success: true;
  data: {
    totalFiles: number;
    totalSize: number;
    filesByType: Record<MediaType, number>;
  };
}

export interface MediaFileRecord {
  _id: string;
  url: string;
  key: string;
  type: MediaType;
  mimeType: string;
  size: number;
  uploadedAt: ISODateString;
  uploadedBy: string;
  originalName?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GetUserMediaFilesResponse {
  success: true;
  data: {
    files: MediaFileRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface GetHealthResponse {
  status: string;
  timestamp: ISODateString;
  uptime: number;
  message: string;
  environment: string;
  database: {
    connected: boolean;
    host: string;
    port: number;
    name: string;
    readyState: number;
  };
  redis: {
    connected: boolean;
    status: string;
    host: string;
    port: number;
  };
}

export interface GetDatabaseHealthResponse {
  database: {
    connected: boolean;
    readyState: number;
    readyStateText: string;
    host: string;
    port: number;
    name: string;
    timestamp: ISODateString;
  };
}

export interface GetRedisHealthResponse {
  redis: {
    connected: boolean;
    status: string;
    host: string;
    port: number;
    timestamp: ISODateString;
    fallback: boolean;
  };
}
