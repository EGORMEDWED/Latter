import React, { useEffect, useState } from 'react';
import { Search, Trash2, User as UserIcon } from 'lucide-react';
import { Table } from '../components/Table';
import { adminApi } from '../services/api';
import type { User } from '../types';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await adminApi.deleteUser(id);
      setUsers(users.filter(u => u._id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const searchTerm = search.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchTerm) ||
      user.username.toLowerCase().includes(searchTerm)
    );
  });

  const columns = [
    { key: 'username', label: 'Username', render: (user: User) => (
      <div className="flex items-center">
        <div className="bg-gray-200 rounded-full p-2 mr-3">
          <UserIcon className="w-4 h-4 text-gray-600" />
        </div>
        {user.username}
      </div>
    )},
    { key: 'email', label: 'Email' },
    { key: 'createdAt', label: 'Created', render: (user: User) => 
      new Date(user.createdAt).toLocaleDateString()
    },
    { key: 'lastLogin', label: 'Last Login', render: (user: User) => 
      user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
    },
    { key: 'actions', label: 'Actions', render: (user: User) => (
      <button
        onClick={() => handleDelete(user._id)}
        className="text-red-600 hover:text-red-800"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )},
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Users Management</h1>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : (
          <Table data={filteredUsers} columns={columns} />
        )}
      </div>
    </div>
  );
};