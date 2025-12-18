import { useState } from 'react';
import { Search, Send, Paperclip, Smile, Mic, Video, Phone, MoreVertical } from 'lucide-react';
import Logo from '../components/Logo';

interface User {
  id: string;
  name: string;
  avatar: string;
  position: string;
  company: string;
  category: string;
  skills: string[];
  isOnline: boolean;
  lastSeen?: string;
}

interface Chat {
  id: string;
  user: User;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isMine: boolean;
  status: 'sent' | 'read';
}

const MOCK_CHATS: Chat[] = [
  {
    id: '1',
    user: {
      id: '1',
      name: 'Анна Смирнова',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=100',
      position: 'Frontend Developer',
      company: 'Yandex',
      category: 'IT & Разработка',
      skills: ['React', 'TypeScript', 'Tailwind'],
      isOnline: true,
    },
    lastMessage: 'Отлично, давайте обсудим детали проекта',
    lastMessageTime: '14:32',
    unreadCount: 2,
  },
  {
    id: '2',
    user: {
      id: '2',
      name: 'Дмитрий Волков',
      avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=100',
      position: 'UI/UX Designer',
      company: 'Figma',
      category: 'Дизайн',
      skills: ['Figma', 'Prototyping', 'User Research'],
      isOnline: false,
      lastSeen: 'вчера',
    },
    lastMessage: 'Спасибо за фидбек! Внесу правки',
    lastMessageTime: 'Вчера',
    unreadCount: 0,
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    content: 'Привет! Увидел ваш профиль, интересный опыт',
    timestamp: '14:28',
    isMine: false,
    status: 'read',
  },
  {
    id: '2',
    content: 'Здравствуйте! Спасибо, рад знакомству',
    timestamp: '14:30',
    isMine: true,
    status: 'read',
  },
  {
    id: '3',
    content: 'Отлично, давайте обсудим детали проекта',
    timestamp: '14:32',
    isMine: false,
    status: 'sent',
  },
];

export default function MainChat({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [selectedChatId, setSelectedChatId] = useState<string>('1');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const selectedChat = MOCK_CHATS.find((c) => c.id === selectedChatId);

  const filteredChats = MOCK_CHATS.filter((chat) =>
    chat.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!message.trim()) return;
    setMessage('');
  };

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
        <aside className="w-80 border-r border-[#E5E7EB] flex flex-col bg-white">
          <div className="p-4 border-b border-[#E5E7EB]">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
              />
              <input
                type="text"
                placeholder="Поиск по людям..."
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#E5E7EB] focus:border-[#2290FF] focus:outline-none transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-[#F3F4F6] transition-colors border-b border-[#E5E7EB] ${
                  selectedChatId === chat.id ? 'bg-[#F9FBFF]' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={chat.user.avatar}
                    alt={chat.user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {chat.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-[#1A1A1A] truncate">
                      {chat.user.name}
                    </h3>
                    <span className="text-xs text-[#6B7280] ml-2">
                      {chat.lastMessageTime}
                    </span>
                  </div>
                  <p className="text-sm text-[#6B7280] truncate">
                    {chat.lastMessage}
                  </p>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="flex-shrink-0 w-5 h-5 bg-[#2290FF] text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {chat.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        </aside>

        {selectedChat ? (
          <>
            <main className="flex-1 flex flex-col bg-[#F9FBFF]">
              <div className="h-16 border-b border-[#E5E7EB] px-6 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={selectedChat.user.avatar}
                      alt={selectedChat.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {selectedChat.user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#1A1A1A]">
                      {selectedChat.user.name}
                    </h2>
                    <p className="text-sm text-[#6B7280]">
                      {selectedChat.user.isOnline
                        ? 'Online'
                        : `Был ${selectedChat.user.lastSeen}`}
                    </p>
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

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {MOCK_MESSAGES.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl ${
                        msg.isMine
                          ? 'bg-white text-[#1A1A1A] rounded-br-md'
                          : 'bg-[#F0F9FF] text-[#1A1A1A] rounded-bl-md'
                      } shadow-sm`}
                    >
                      <p>{msg.content}</p>
                      <div
                        className={`text-xs mt-1 flex items-center gap-1 ${
                          msg.isMine ? 'justify-end' : 'justify-start'
                        } text-[#6B7280]`}
                      >
                        <span>{msg.timestamp}</span>
                        {msg.isMine && (
                          <span className={msg.status === 'read' ? 'text-[#2290FF]' : ''}>
                            ✓✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#E5E7EB] p-4 bg-white">
                <div className="flex items-end gap-2">
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
                      <Paperclip size={20} className="text-[#6B7280]" />
                    </button>
                    <button className="w-10 h-10 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
                      <Smile size={20} className="text-[#6B7280]" />
                    </button>
                  </div>
                  <textarea
                    placeholder="Сообщение..."
                    className="flex-1 max-h-32 px-4 py-3 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2290FF] focus:outline-none resize-none transition-colors"
                    rows={1}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  {message.trim() ? (
                    <button
                      onClick={handleSendMessage}
                      className="w-10 h-10 rounded-lg bg-[#2290FF] hover:bg-[#1a7ae6] flex items-center justify-center transition-colors"
                    >
                      <Send size={20} className="text-white" />
                    </button>
                  ) : (
                    <button className="w-10 h-10 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center transition-colors">
                      <Mic size={20} className="text-[#6B7280]" />
                    </button>
                  )}
                </div>
              </div>
            </main>

            <aside className="w-80 border-l border-[#E5E7EB] p-6 bg-white overflow-y-auto">
              <div className="text-center mb-6">
                <img
                  src={selectedChat.user.avatar}
                  alt={selectedChat.user.name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
                />
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                  {selectedChat.user.name}
                </h2>
                <p className="text-[#6B7280] mb-1">{selectedChat.user.position}</p>
                <p className="text-sm text-[#6B7280]">{selectedChat.user.company}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-[#6B7280] mb-2">Категория</h3>
                  <span className="inline-block px-3 py-1.5 bg-[#E0F0FF] text-[#2290FF] rounded-lg text-sm font-medium">
                    {selectedChat.user.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[#6B7280] mb-2">Навыки</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedChat.user.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 bg-[#F0F9FF] text-[#2290FF] rounded-lg text-sm font-medium border border-[#2290FF]/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#F9FBFF]">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-[#2290FF] to-[#0066CC] rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Search size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
                Нет активных диалогов
              </h2>
              <p className="text-[#6B7280]">Начните поиск профессионалов!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
