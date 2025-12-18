import { useState, FormEvent } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/Logo';

interface SignUpProps {
  onNavigate: (path: string, data?: { email: string }) => void;
}

export default function SignUp({ onNavigate }: SignUpProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string) => {
    if (password.length < 8) return 'Минимум 8 символов';
    if (!/\d/.test(password)) return 'Должна быть цифра';
    if (!/[!@#$%^&*]/.test(password)) return 'Должен быть спецсимвол';
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.email.includes('@')) {
      newErrors.email = 'Некорректный email';
    }
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Введите имя';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Введите фамилию';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    onNavigate('/auth/verify-email', { email: formData.email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBFF] via-white to-[#F0F9FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">
            Создайте аккаунт
          </h1>
          <p className="text-[#6B7280]">
            Присоединяйтесь к профессиональному сообществу
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/5 p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              icon={<Mail size={20} />}
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
            />

            <Input
              label="Пароль"
              type="password"
              placeholder="Минимум 8 символов"
              icon={<Lock size={20} />}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Имя"
                placeholder="Иван"
                icon={<User size={20} />}
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  setErrors({ ...errors, firstName: '' });
                }}
                error={errors.firstName}
              />

              <Input
                label="Фамилия"
                placeholder="Иванов"
                icon={<User size={20} />}
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  setErrors({ ...errors, lastName: '' });
                }}
                error={errors.lastName}
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-6">
              Продолжить
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => onNavigate('/auth/login')}
              className="text-[#2290FF] hover:underline font-medium"
            >
              Уже есть аккаунт? Войти
            </button>
          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#6B7280]">
                  Или войти через
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 h-12 px-4 border-2 border-[#E5E7EB] rounded-xl hover:bg-[#F3F4F6] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#2290FF"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#2290FF"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#2290FF"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#2290FF"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-medium text-[#1A1A1A]">Google</span>
              </button>

              <button className="flex items-center justify-center gap-2 h-12 px-4 border-2 border-[#E5E7EB] rounded-xl hover:bg-[#F3F4F6] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#2290FF">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span className="font-medium text-[#1A1A1A]">Apple</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
