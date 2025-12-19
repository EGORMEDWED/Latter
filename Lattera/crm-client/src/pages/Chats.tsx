import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Table } from '../components/Table';
import { adminApi } from '../services/api';
import type { Chat } from '../types';

export const Chats: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.getChats();
      setChats(data);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'id', label: 'Chat ID', render: (chat: Chat) => (
      <div className="flex items-center">
        <MessageSquare className="w-4 h-4 mr-3 text-gray-600" />
        {chat._id.substring(chat._id.length - 8)}
      </div>
    )},
    { key: 'participants', label: 'Participants', render: (chat: Chat) => 
      `${chat.participants.length} users`
    },
    { key: 'messageCount', label: 'Messages' },
    { key: 'createdAt', label: 'Created', render: (chat: Chat) => 
      new Date(chat.createdAt).toLocaleDateString()
    },
    { key: 'updatedAt', label: 'Last Activity', render: (chat: Chat) => 
      new Date(chat.updatedAt).toLocaleDateString()
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Chat Management</h1>
      
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : (
          <Table data={chats} columns={columns} />
        )}
      </div>
    </div>
  );
};