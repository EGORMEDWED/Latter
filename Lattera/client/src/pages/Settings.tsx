import { useState } from 'react';
import { User, Lock, Bell, LogOut, Camera } from 'lucide-react';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';

export default function Settings({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [profileData, setProfileData] = useState({
    firstName: 'Иван',
    lastName: 'Иванов',
    position: 'Frontend Developer',
    company: 'Yandex',
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [notifications, setNotifications] = useState({
    sound: true,
    push: true,
    email: false,
  });

  const handleSaveProfile = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    addToast('success', 'Профиль успешно обновлен');
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      addToast('error', 'Пароли не совпадают');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setShowPasswordModal(false);
    setPasswordData({ current: '', new: '', confirm: '' });
    addToast('success', 'Пароль успешно изменен');
  };

  const handleLogoutAll = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setShowLogoutModal(false);
    addToast('success', 'Выполнен выход со всех устройств');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBFF] via-white to-[#F0F9FF]">
      <header className="h-16 border-b border-[#E5E7EB] px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <Logo size="sm" />
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('/')}
            className="px-4 py-2 text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg font-medium transition-colors"
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
            className="px-4 py-2 text-[#2290FF] bg-[#F0F9FF] rounded-lg font-medium"
          >
            Настройки
          </button>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-[#1A1A1A] mb-8">Настройки</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-[#2290FF] text-white shadow-lg shadow-blue-500/30'
                : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]'
            }`}
          >
            <User size={18} className="inline mr-2" />
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-[#2290FF] text-white shadow-lg shadow-blue-500/30'
                : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]'
            }`}
          >
            <Lock size={18} className="inline mr-2" />
            Безопасность
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-[#2290FF] text-white shadow-lg shadow-blue-500/30'
                : 'bg-white text-[#6B7280] hover:bg-[#F3F4F6]'
            }`}
          >
            <Bell size={18} className="inline mr-2" />
            Уведомления
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-blue-500/5 p-8">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-6 pb-6 border-b border-[#E5E7EB]">
                <div className="relative">
                  <img
                    src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=200"
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#2290FF] rounded-full flex items-center justify-center text-white hover:bg-[#1a7ae6] transition-colors">
                    <Camera size={16} />
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                    {profileData.firstName} {profileData.lastName}
                  </h2>
                  <p className="text-[#6B7280]">{profileData.position}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Имя"
                  value={profileData.firstName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, firstName: e.target.value })
                  }
                />
                <Input
                  label="Фамилия"
                  value={profileData.lastName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, lastName: e.target.value })
                  }
                />
              </div>

              <Input
                label="Должность"
                value={profileData.position}
                onChange={(e) =>
                  setProfileData({ ...profileData, position: e.target.value })
                }
              />

              <Input
                label="Компания"
                value={profileData.company}
                onChange={(e) =>
                  setProfileData({ ...profileData, company: e.target.value })
                }
              />

              <Button onClick={handleSaveProfile} className="w-full">
                Сохранить изменения
              </Button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">
                  Безопасность аккаунта
                </h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full p-4 border-2 border-[#E5E7EB] rounded-xl hover:border-[#2290FF] transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#1A1A1A] mb-1">Сменить пароль</p>
                        <p className="text-sm text-[#6B7280]">
                          Последнее изменение: 2 месяца назад
                        </p>
                      </div>
                      <Lock size={20} className="text-[#6B7280]" />
                    </div>
                  </button>

                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full p-4 border-2 border-[#E5E7EB] rounded-xl hover:border-[#EF4444] transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#1A1A1A] mb-1">
                          Выйти со всех устройств
                        </p>
                        <p className="text-sm text-[#6B7280]">
                          Активных сеансов: 3
                        </p>
                      </div>
                      <LogOut size={20} className="text-[#EF4444]" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">
                Настройки уведомлений
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border-2 border-[#E5E7EB] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] mb-1">Звук уведомлений</p>
                    <p className="text-sm text-[#6B7280]">
                      Воспроизводить звук при получении сообщений
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({ ...notifications, sound: !notifications.sound })
                    }
                    className={`w-14 h-8 rounded-full transition-colors ${
                      notifications.sound ? 'bg-[#2290FF]' : 'bg-[#E5E7EB]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full transition-transform ${
                        notifications.sound ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border-2 border-[#E5E7EB] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] mb-1">Push-уведомления</p>
                    <p className="text-sm text-[#6B7280]">
                      Получать уведомления на устройство
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({ ...notifications, push: !notifications.push })
                    }
                    className={`w-14 h-8 rounded-full transition-colors ${
                      notifications.push ? 'bg-[#2290FF]' : 'bg-[#E5E7EB]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full transition-transform ${
                        notifications.push ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border-2 border-[#E5E7EB] rounded-xl">
                  <div>
                    <p className="font-medium text-[#1A1A1A] mb-1">Email-уведомления</p>
                    <p className="text-sm text-[#6B7280]">
                      Получать важные уведомления на почту
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setNotifications({ ...notifications, email: !notifications.email })
                    }
                    className={`w-14 h-8 rounded-full transition-colors ${
                      notifications.email ? 'bg-[#2290FF]' : 'bg-[#E5E7EB]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 bg-white rounded-full transition-transform ${
                        notifications.email ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Сменить пароль"
      >
        <div className="space-y-4">
          <Input
            label="Текущий пароль"
            type="password"
            value={passwordData.current}
            onChange={(e) =>
              setPasswordData({ ...passwordData, current: e.target.value })
            }
          />
          <Input
            label="Новый пароль"
            type="password"
            value={passwordData.new}
            onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
          />
          <Input
            label="Подтвердите пароль"
            type="password"
            value={passwordData.confirm}
            onChange={(e) =>
              setPasswordData({ ...passwordData, confirm: e.target.value })
            }
          />
          <Button onClick={handleChangePassword} className="w-full">
            Изменить пароль
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Выйти со всех устройств?"
      >
        <div className="space-y-4">
          <p className="text-[#6B7280]">
            Вы будете автоматически выведены из всех активных сеансов. Придется войти
            заново на каждом устройстве.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowLogoutModal(false)}
              variant="secondary"
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={handleLogoutAll}
              className="flex-1 bg-[#EF4444] hover:bg-[#dc2626]"
            >
              Выйти
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
