import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCheck, Check, Play, Volume2, MoreVertical, Edit2, Copy, CheckCircle, X, Trash2 } from 'lucide-react';
import type { MessageWithSenderResponse, MessageResponse } from '../types/api';
import { useApp } from '../contexts/AppContext';

type MessageWithFlags = MessageWithSenderResponse & {
  _isNew?: boolean;
  _isDeleting?: boolean;
  _isEditing?: boolean;
};

interface MessageWindowProps {
  chatId: string;
  messages: MessageWithFlags[];
  setMessages: React.Dispatch<React.SetStateAction<MessageWithFlags[]>>;
  currentUserId: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  typingUsers?: Set<string>;
  setTypingUsers?: React.Dispatch<React.SetStateAction<Set<string>>>;
  participantNames?: Map<string, string>;
  setOnlineUsers?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onEditMessage?: (messageId: string, content: string, chatId: string) => Promise<void>;
}

interface MessageItemProps {
  message: MessageWithFlags;
  isMine: boolean;
  senderName?: string;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onEditMessage?: (messageId: string, content: string, chatId: string) => Promise<void>;
  showEditMenu?: boolean;
}

function MessageItem({ message, isMine, senderName, onDeleteMessage, onEditMessage }: MessageItemProps) {
  const [imageError, setImageError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [editLoading, setEditLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { addToast } = useApp();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEdit = () => {
    if (!isMine || !message.timestamp) return false;
    const messageTime = new Date(message.timestamp).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    return now - messageTime < fifteenMinutes;
  };

  const handleDelete = async () => {
    if (!onDeleteMessage) return;
    setShowMenu(false);
    
    try {
      await onDeleteMessage(message.id);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      addToast('success', 'Текст скопирован');
    }
    setShowMenu(false);
  };

  const handleEditStart = () => {
    if (!canEdit() || !message.content) return;
    setEditContent(message.content);
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleEditSave = async () => {
    if (!onEditMessage || !message.content || editContent.trim() === message.content.trim()) {
      setIsEditing(false);
      return;
    }

    setEditLoading(true);
    try {
      await onEditMessage(message.id, editContent.trim(), message.chatId);
      setIsEditing(false);
      addToast('success', 'Сообщение отредактировано');
    } catch (error) {
      console.error('Error editing message:', error);
      addToast('error', 'Не удалось отредактировать сообщение');
      setEditContent(message.content);
      setIsEditing(false);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditContent(message.content || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  };

  const renderMedia = () => {
    if (!message.media || imageError) return null;

    const { type, url } = message.media;

    switch (type) {
      case 'image':
        return (
          <img
            src={url}
            alt="Attached"
            className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onError={() => setImageError(true)}
            onClick={() => window.open(url, '_blank')}
          />
        );
      case 'video':
        return (
          <video
            src={url}
            controls
            className="max-w-sm rounded-lg"
            preload="metadata"
          >
            <track kind="captions" />
          </video>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2 p-3 bg-[#F3F4F6] rounded-lg">
            <Volume2 size={20} className="text-[#6B7280]" />
            <audio src={url} controls className="flex-1">
              <track kind="captions" />
            </audio>
          </div>
        );
      default:
        return null;
    }
  };

  const renderMessageContent = () => {
    if (isEditing) {
      return (
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={editLoading}
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={handleEditSave}
                disabled={editLoading || !editContent.trim() || editContent.trim() === message.content?.trim()}
                className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
              </button>
              <button
                onClick={handleEditCancel}
                disabled={editLoading}
                className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Enter - сохранить, Esc - отмена, Shift+Enter - новая строка
          </p>
        </div>
      );
    }

    return (
      <>
        {message.editedAt && (
          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold mb-1">
            <Edit2 size={10} />
            отредактировано
          </span>
        )}
        {!isMine && senderName && (
          <p className="text-xs font-semibold text-[#2290FF] mb-1">
            {senderName}
          </p>
        )}
        {message.media && <div className="mb-2">{renderMedia()}</div>}
        {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
      </>
    );
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-md px-4 py-3 rounded-2xl transition-all duration-300 ${
          isMine
            ? 'bg-white text-[#1A1A1A] rounded-br-md'
            : 'bg-[#F0F9FF] text-[#1A1A1A] rounded-bl-md'
        } shadow-sm ${
          message._isDeleting 
            ? 'opacity-30 scale-95' 
            : message._isNew 
              ? 'animate-slide-in-from-bottom' 
              : ''
        } ${
          isEditing ? 'bg-blue-50 border border-blue-200' : ''
        }`}
      >
        {renderMessageContent()}
        
        <div
          className={`text-xs mt-1 flex items-center justify-between ${
            isMine ? 'justify-end' : 'justify-start'
          } text-[#6B7280]`}
        >
          <div className="flex items-center gap-1">
            <span>{formatTime(message.timestamp)}</span>
            {isMine && (
              <div className="flex items-center gap-1 mt-1 text-xs text-[#6B7280]">
                {message.status === 'sending' ? (
                  <Loader2 size={16} className="animate-spin text-[#6B7280]" />
                ) : message.deliveredAt ? (
                  <CheckCheck size={16} className="text-blue-500" />
                ) : (
                  <Check size={16} className="text-gray-400" />
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {/* Меню действий для моих сообщений */}
            {isMine && message.status !== 'sending' && !isEditing && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <MoreVertical size={14} className="text-gray-500" />
                </button>
                
                {showMenu && (
                  <div className="absolute bottom-full right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32">
                    {canEdit() && !message.media && (
                      <button
                        onClick={handleEditStart}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors"
                      >
                        <Edit2 size={14} />
                        Редактировать
                      </button>
                    )}
                    
                    {message.content && (
                      <button
                        onClick={handleCopy}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 transition-colors"
                      >
                        <Copy size={14} />
                        Копировать текст
                      </button>
                    )}
                    
                    {onDeleteMessage && (
                      <button
                        onClick={handleDelete}
                        disabled={message._isDeleting}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {message._isDeleting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <span>Вы уверены?
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessageWindow({
  chatId,
  messages,
  setMessages,
  currentUserId,
  loading,
  hasMore,
  onLoadMore,
  typingUsers = new Set(),
  participantNames = new Map(),
  setOnlineUsers,
  onDeleteMessage,
  onEditMessage,
}: MessageWindowProps) {
  const { socketService } = useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    const unsubNew = socketService.onNewMessage((message: MessageResponse) => {
      if (message.chatId !== chatId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;

        const messageWithSender: MessageWithSenderResponse = {
          ...message,
          sender: message.sender || {
            id: message.senderId,
            firstName: '',
            lastName: '',
          },
        };

        return [...prev, messageWithSender];
      });
    });

    const unsubDelete = socketService.onMessageDeleted((data) => {
      if (data.chatId === chatId) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    });

    const unsubEdit = socketService.onMessageEdited((data) => {
      if (data.chatId === chatId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? { ...m, content: data.content, editedAt: data.editedAt }
              : m
          )
        );
      }
    });

    const unsubUserStatus = socketService.onUserStatus((status) => {
      if (!setOnlineUsers) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status.status === 'online') {
          next.add(status.userId);
        } else {
          next.delete(status.userId);
        }
        return next;
      });
    });

    return () => {
      unsubNew();
      unsubDelete();
      unsubEdit();
      unsubUserStatus();
    };
  }, [chatId, setMessages, setOnlineUsers, socketService]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom('auto');
    }
  }, [messages, shouldAutoScroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);

    if (scrollTop < 100 && hasMore && onLoadMore && !loading) {
      onLoadMore();
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FBFF]">
        <div className="text-center">
          <Loader2 size={48} className="text-[#2290FF] animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280]">Загрузка сообщений...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FBFF]">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[#2290FF] to-[#0066CC] rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Play size={48} className="text-white ml-2" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
            Начните разговор
          </h2>
          <p className="text-[#6B7280]">Отправьте первое сообщение!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F9FBFF]"
      onScroll={handleScroll}
    >
      {loading && hasMore && (
        <div className="flex justify-center py-2">
          <Loader2 size={24} className="text-[#2290FF] animate-spin" />
        </div>
      )}

      {messages.map((message) => {
        const isMine = message.senderId === currentUserId;
        const senderName = isMine
          ? undefined
          : participantNames.get(message.senderId) ||
            `${message.sender?.firstName || ''} ${message.sender?.lastName || ''}`.trim();

        return (
          <MessageItem
            key={message.id}
            message={message}
            isMine={isMine}
            senderName={senderName}
            onDeleteMessage={onDeleteMessage}
            onEditMessage={onEditMessage}
          />
        );
      })}

      {typingUsers.size > 0 && (
        <div className="flex justify-start">
          <div className="px-4 py-3 rounded-2xl bg-[#F0F9FF] rounded-bl-md">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#6B7280] rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-[#6B7280] rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-[#6B7280] rounded-full animate-bounce delay-200" />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
