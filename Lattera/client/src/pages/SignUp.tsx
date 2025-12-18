import { useState, type FormEvent } from 'react';
import { Mail, Lock } from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/Logo';

import { api } from '../services/api';
import { ApiError } from '../utils/apiClient';
import { useApp } from '../contexts/AppContext';
import type { NavigateFn } from '../routes';

interface SignUpProps {
  onNavigate: NavigateFn;
}

const validateEmail = (email: string): string => {
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return 'Некорректный email';
  return '';
};

const validatePassword = (password: string): string => {
  if (password.length < 8) return 'Минимум 8 символов';
  if (!/\d/.test(password)) return 'Должна быть цифра';

  if (!/[!@#$%^&*()_+\-={};':"\\|,.<>/?]/.test(password)) {
    return 'Должен быть спецсимвол';
  }

  return '';
};

export default function SignUp({ onNavigate }: SignUpProps) {
  const { addToast } = useApp();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const email = formData.email.trim().toLowerCase();

      await api.auth.register({
        email,
        password: formData.password,
      });

      addToast('success', 'Код подтверждения отправлен на почту');
      onNavigate('/auth/verify-email', {
        email,
        password: formData.password,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.statusCode === 409) {
          setErrors({ email: 'Email уже зарегистрирован' });
          addToast('error', 'Email уже зарегистрирован');
        } else if (error.statusCode === 400) {
          setErrors({ password: error.message });
          addToast('error', error.message);
        } else {
          addToast('error', error.message);
        }
      } else {
        addToast('error', 'Не удалось зарегистрироваться');
      }
    } finally {
      setLoading(false);
    }
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

            <Button type="submit" loading={loading} className="w-full mt-6">
              Продолжить
            </Button>
          </form>

          <p className="mt-6 text-sm text-[#6B7280]">
            Пароль должен быть не короче 8 символов и содержать цифру и
            спецсимвол.
          </p>
        </div>
      </div>
    </div>
  );
}
