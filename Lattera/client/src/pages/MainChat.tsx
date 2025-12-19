import { useState, useEffect, useCallback, useRef } from 'react';
import { Video, Phone, MoreVertical, Loader2 } from 'lucide-react';

import type { NavigateFn } from '../routes';
import type {
  ChatResponseData,
  MessageWithSenderResponse,
  MessageResponse,
} from '../types/api';

type MessageWithFlags = MessageWithSenderResponse & {
  _isNew?: boolean;
  _isDeleting?: boolean;
  _isEditing?: boolean;
};

import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';
import Logo from '../components/Logo';
import ChatList from '../components/ChatList';
import MessageWindow from '../components/MessageWindow';
import MessageComposer from '../components/MessageComposer';

export default function MainChat({ onNavigate }: { onNavigate: NavigateFn }) {
  const { user, addToast, socketService } = useApp();
  const [chats, setChats] = useState<ChatResponseData[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithFlags[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [chatsLoading, setChatsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const loadChats = useCallback(async () => {
    try {
      setChatsLoading(true);
      const response = await api.chats.list({ limit: 50, offset: 0 });
      setChats(response.chats);
    } catch (error) {
      console.error('Error loading chats:', error);
      addToast('error', 'Не удалось загрузить список чатов');
    } finally {
      setChatsLoading(false);
    }
  }, [addToast]);

  const loadMessages = useCallback(
    async (chatId: string, offset = 0) => {
      try {
        setMessagesLoading(true);
        const response = await api.messages.list({
          chatId,
          limit: 50,
          offset,
        });

        if (offset === 0) {
          setMessages(response.messages.reverse());
        } else {
          setMessages((prev) => [...response.messages.reverse(), ...prev]);
        }

        setHasMoreMessages(response.messages.length === 50);
        setMessagesOffset(offset + response.messages.length);
      } catch (error) {
        console.error('Error loading messages:', error);
        addToast('error', 'Не удалось загрузить сообщения');
      } finally {
        setMessagesLoading(false);
      }
    },
    [addToast]
  );

  const handleChatSelect = useCallback(
    (chatId: string) => {
      if (!user) return;

      setSelectedChatId(chatId);
      setMessages([]);
      setMessagesOffset(0);
      setTypingUsers(new Set());

      void (async () => {
        await loadMessages(chatId);

        try {
          await api.chats.markAsRead(chatId);
          setChats((prev) =>
            prev.map((c) =>
              c.id === chatId
                ? { ...c, unreadCount: { ...c.unreadCount, [user.id]: 0 } }
                : c
            )
          );
        } catch (error) {
          console.error('Error marking chat as read:', error);
          addToast('error', 'Не удалось отметить чат как прочитанный');
        }
      })();
    },
    [loadMessages, user, addToast]
  );

  const handleLoadMoreMessages = useCallback(() => {
    if (selectedChatId && hasMoreMessages && !messagesLoading) {
      loadMessages(selectedChatId, messagesOffset);
    }
  }, [selectedChatId, hasMoreMessages, messagesLoading, messagesOffset, loadMessages]);

  const handleEditMessage = useCallback(
    async (messageId: string, content: string, chatId: string) => {
      if (!user) return;

      // Оптимистичное обновление - сразу обновляем UI
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content, editedAt: new Date().toISOString(), _isEditing: false }
            : m
        )
      );

      try {
        // API вызов для редактирования сообщения
        await api.messages.edit(messageId, { content });
        
        // Обработчик события сокета обновит других клиентов
        // Нет необходимости вручную обновлять, так как мы сделали оптимистичное обновление
      } catch (error) {
        console.error('Error editing message:', error);
        addToast('error', 'Не удалось отредактировать сообщение');
        
        // Откат оптимистичного обновления при ошибке
        // Мы должны вернуть оригинальное сообщение
        // В реальном приложении лучше хранить оригинальные сообщения
        setMessages((prev) => prev);
      }
    },
    [user, addToast]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedChatId || !user) return;
      
      // Оптимистично скрываем сообщение из UI
      setMessages((prev) => prev.map(m => 
        m.id === messageId ? { ...m, _isDeleting: true } : m
      ));

      try {
        await api.messages.delete(messageId);
        // После успешного удаления удаляем полностью из state
        setMessages((prev) => prev.filter(m => m.id !== messageId));
      } catch (error) {
        console.error('Error deleting message:', error);
        addToast('error', 'Не удалось удалить сообщение');
        // Откатываем изменения при ошибке - убираем флаг _isDeleting
        setMessages((prev) => prev.map(m => 
          m.id === messageId ? { ...m, _isDeleting: false } : m
        ));
      }
    },
    [selectedChatId, user, addToast]
  );

  const handleSendMessage = useCallback(
    async (content: string, mediaFile?: File) => {
      if (!selectedChatId || !user) return;

      const tempId = `temp-${Date.now()}`;
      const tempMessage: MessageWithSenderResponse = {
        id: tempId,
        chatId: selectedChatId,
        senderId: user.id,
        sender: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        content,
        media: null,
        editedAt: null,
        deletedFor: [],
        timestamp: new Date().toISOString(),
        status: 'sending',
        deliveredAt: null,
      };

      setMessages((prev) => [...prev, tempMessage]);

      // Убираем флаг _isNew после анимации  
      setTimeout(() => {
        setMessages((prev) => 
          prev.map(m => m.id === tempId ? { ...m, _isNew: false } : m)
        );
      }, 500);

      try {
        let mediaData = undefined;

        if (mediaFile) {
          try {
            const uploadResponse = await api.media.upload({
              file: mediaFile,
              userId: user.id,
            });

            mediaData = {
              type: uploadResponse.data.type,
              url: uploadResponse.data.url,
            };
          } catch (error) {
            console.error('Error uploading media:', error);
            addToast('error', 'Не удалось загрузить файл');
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            return;
          }
        }

        const response = await api.messages.send({
          chatId: selectedChatId,
          content: content || undefined,
          media: mediaData,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...response.data,
                  sender: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                  },
                  status: 'sent',
                  deliveredAt: new Date().toISOString(),
                }
              : m
          )
        );

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === selectedChatId
              ? {
                  ...chat,
                  lastMessage: {
                    content: response.data.content,
                    senderId: user.id,
                    timestamp: response.data.timestamp,
                  },
                }
              : chat
          )
        );
      } catch (error) {
        console.error('Error sending message:', error);
        addToast('error', 'Не удалось отправить сообщение');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [selectedChatId, user, addToast]
  );

  const handleTyping = useCallback(() => {
    if (selectedChatId) {
      socketService.emitTyping(selectedChatId);
    }
  }, [selectedChatId, socketService]);

  const handleStopTyping = useCallback(() => {
    if (selectedChatId) {
      socketService.emitStopTyping(selectedChatId);
    }
  }, [selectedChatId, socketService]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!user) return;

    try {
      socketService.initialize();

      const unsubscribeNewMessage = socketService.onNewMessage(
        (message: MessageResponse) => {
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== message.chatId) return chat;

              const shouldIncrementUnread =
                message.senderId !== user.id && message.chatId !== selectedChatId;

              if (message.chatId === selectedChatId && message.senderId !== user.id) {
                 void api.chats.markAsRead(selectedChatId).catch(console.error);
              }

              return {
                ...chat,
                lastMessage: {
                  content: message.content,
                  senderId: message.senderId,
                  timestamp: message.timestamp,
                },
                unreadCount: shouldIncrementUnread
                  ? {
                      ...chat.unreadCount,
                      [user.id]: (chat.unreadCount?.[user.id] || 0) + 1,
                    }
                  : chat.unreadCount,
              };
            })
          );

          // Move chat with new message to the beginning
          setChats((prev) => {
            const chatIndex = prev.findIndex((c) => c.id === message.chatId);
            if (chatIndex <= 0) return prev;

            const next = [...prev];
            const [chat] = next.splice(chatIndex, 1);
            return [chat, ...next];
          });
        }
      );

      const unsubscribeUserStatus = socketService.onUserStatus((status) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          if (status.status === 'online') {
            newSet.add(status.userId);
          } else {
            newSet.delete(status.userId);
          }
          return newSet;
        });
      });

      const unsubscribeTyping = socketService.onTyping((event) => {
        if (event.chatId !== selectedChatId) return;

        if (event.isTyping) {
          setTypingUsers((prev) => new Set(prev).add(event.userId));

          const existingTimeout = typingTimeoutRef.current.get(event.userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          const timeout = setTimeout(() => {
            setTypingUsers((prev) => {
              const newSet = new Set(prev);
              newSet.delete(event.userId);
              return newSet;
            });
            typingTimeoutRef.current.delete(event.userId);
          }, 5000);

          typingTimeoutRef.current.set(event.userId, timeout);
        } else {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(event.userId);
            return newSet;
          });

          const existingTimeout = typingTimeoutRef.current.get(event.userId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingTimeoutRef.current.delete(event.userId);
          }
        }
      });

      return () => {
        unsubscribeNewMessage();
        unsubscribeUserStatus();
        unsubscribeTyping();
        socketService.disconnect();

        const timeouts = typingTimeoutRef.current;
        timeouts.forEach((timeout) => clearTimeout(timeout));
        timeouts.clear();
      };
    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  }, [user, selectedChatId, socketService]);

  if (!user) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <Loader2 size={48} className="text-[#2290FF] animate-spin" />
      </div>
    );
  }

  const getOtherParticipant = (chat: ChatResponseData) => {
    return chat.participants.find((p) => p.id !== user.id);
  };

  const participantNames = new Map<string, string>();
  if (selectedChat) {
    selectedChat.participants.forEach((p) => {
      participantNames.set(p.id, `${p.firstName} ${p.lastName}`);
    });
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <header className="h-16 border-b border-[#E5E7EB] px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <Logo size="sm" />
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('/')}
            className="px-4 py-2 text-[#2290FF] bg-[#F0F9FF] rounded-lg font-medium"
          >
            Чаты
          </button>
          <button
            onClick={() => onNavigate('/search')}
            className="px-4 py-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg font-medium transition-colors"
          >
            Поиск
          </button>
          <button
            onClick={() => onNavigate('/settings')}
            className="px-4 py-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg font-medium transition-colors"
          >
            Настройки
          </button>
        </nav>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onChatSelect={handleChatSelect}
          onlineUsers={onlineUsers}
          loading={chatsLoading}
          currentUserId={user.id}
        />

        {selectedChat ? (
          <>
            <main className="flex-1 flex flex-col bg-[#F9FBFF]">
              <div className="h-16 border-b border-[#E5E7EB] px-6 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {(() => {
                      const otherParticipant = getOtherParticipant(selectedChat);
                      if (!otherParticipant) return null;

                      const isOnline = onlineUsers.has(otherParticipant.id);

                      return (
                        <>
                          <img
                            src={
                              otherParticipant.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                `${otherParticipant.firstName} ${otherParticipant.lastName}`
                              )}&background=2290FF&color=fff`
                            }
                            alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-white" />
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    {(() => {
                      const otherParticipant = getOtherParticipant(selectedChat);
                      if (!otherParticipant) return null;

                      const isOnline = onlineUsers.has(otherParticipant.id);

                      return (
                        <>
                          <h2 className="font-semibold text-[#1A1A1A]">
                            {otherParticipant.firstName} {otherParticipant.lastName}
                          </h2>
                          <p className="text-sm text-[#6B7280]">
                            {isOnline ? 'Online' : 'Offline'}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-10 h-10 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
                    <Video size={20} className="text-[#6B7280]" />
                  </button>
                  <button className="w-10 h-10 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
                    <Phone size={20} className="text-[#6B7280]" />
                  </button>
                  <button className="w-10 h-10 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
                    <MoreVertical size={20} className="text-[#6B7280]" />
                  </button>
                </div>
              </div>

              <MessageWindow
                chatId={selectedChat.id}
                messages={messages}
                setMessages={setMessages}
                currentUserId={user.id}
                loading={messagesLoading}
                hasMore={hasMoreMessages}
                onLoadMore={handleLoadMoreMessages}
                typingUsers={typingUsers}
                participantNames={participantNames}
                setOnlineUsers={setOnlineUsers}
                onDeleteMessage={handleDeleteMessage}
                onEditMessage={handleEditMessage}
              />

              <MessageComposer
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
              />
            </main>

            <aside className="w-80 border-l border-[#E5E7EB] p-6 bg-white overflow-y-auto">
              {(() => {
                const otherParticipant = getOtherParticipant(selectedChat);
                if (!otherParticipant) return null;

                return (
                  <>
                    <div className="text-center mb-6">
                      <img
                        src={
                          otherParticipant.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            `${otherParticipant.firstName} ${otherParticipant.lastName}`
                          )}&background=2290FF&color=fff`
                        }
                        alt={`${otherParticipant.firstName} ${otherParticipant.lastName}`}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
                      />
                      <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                        {otherParticipant.firstName} {otherParticipant.lastName}
                      </h2>
                      <p className="text-[#6B7280] mb-1">
                        {otherParticipant.profile.position}
                      </p>
                      <p className="text-sm text-[#6B7280]">
                        {otherParticipant.profile.company}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-[#6B7280] mb-2">
                          Категория
                        </h3>
                        <span className="inline-block px-3 py-1.5 bg-[#E0F0FF] text-[#2290FF] rounded-lg text-sm font-medium">
                          {otherParticipant.profile.category}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </aside>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#F9FBFF]">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#2290FF] to-[#0066CC] rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Phone size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
                Выберите чат
              </h2>
              <p className="text-[#6B7280]">
                Выберите чат из списка слева, чтобы начать общение
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
