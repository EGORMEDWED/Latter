import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, Mail, Activity } from 'lucide-react';
import { adminApi } from '../services/api';
import type { Stats } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-green-600' },
    { label: 'Active Chats', value: stats?.activeChats || 0, icon: MessageSquare, color: 'text-blue-600' },
    { label: 'Total Messages', value: stats?.totalMessages || 0, icon: Activity, color: 'text-purple-600' },
    { label: 'New Feedback', value: stats?.newFeedback || 0, icon: Mail, color: 'text-orange-600' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {card.value as React.ReactNode}
                  </p>
                </div>
                <card.icon className={`w-8 h-8 ${card.color}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};