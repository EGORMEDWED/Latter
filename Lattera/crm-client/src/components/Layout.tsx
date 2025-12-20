import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 ml-64 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
};