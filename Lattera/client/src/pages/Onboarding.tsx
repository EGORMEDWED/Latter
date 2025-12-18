import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Building2, Tag, User, X } from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/Logo';

import type { ProfileCategory } from '../types/api';
import { api } from '../services/api';
import { ApiError } from '../utils/apiClient';
import { useApp } from '../contexts/AppContext';
import type { NavigateFn } from '../routes';

interface OnboardingProps {
  onNavigate: NavigateFn;
}

const CATEGORIES: Array<{ label: string; value: ProfileCategory }> = [
  { label: 'IT & Разработка', value: 'IT' },
  { label: 'Маркетинг', value: 'Marketing' },
  { label: 'Дизайн', value: 'Design' },
  { label: 'Финансы', value: 'Finance' },
  { label: 'Другое', value: 'Other' },
];

export default function Onboarding({ onNavigate }: OnboardingProps) {
  const { addToast, setUser } = useApp();

  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    company: string;
    category: ProfileCategory | '';
  }>({
    firstName: '',
    lastName: '',
    company: '',
    category: '',
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();

    if (!trimmed) return;

    if (trimmed.length > 50) {
      addToast('error', 'Навык должен быть короче 50 символов');
      return;
    }

    if (skills.length >= 10) {
      addToast('error', 'Можно указать максимум 10 навыков');
      return;
    }

    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }

    setSkillInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Введите имя';
    } else if (formData.firstName.trim().length > 50) {
      newErrors.firstName = 'Имя должно быть короче 50 символов';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Введите фамилию';
    } else if (formData.lastName.trim().length > 50) {
      newErrors.lastName = 'Фамилия должна быть короче 50 символов';
    }

    if (!formData.category) {
      newErrors.category = 'Выберите категорию';
    }

    if (formData.company.trim().length > 100) {
      newErrors.company = 'Компания должна быть короче 100 символов';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await api.users.updateMe({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        profile: {
          company: formData.company.trim(),
          category: formData.category as ProfileCategory,
          skills,
        },
      });

      setUser(response.user);
      addToast('success', 'Профиль сохранён');
      onNavigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        addToast('error', err.message);
      } else {
        addToast('error', 'Не удалось сохранить профиль');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBFF] via-white to-[#F0F9FF] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/5 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-2 bg-[#2290FF] rounded-full" />
              <div className="flex-1 h-2 bg-[#2290FF] rounded-full" />
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">
                Расскажите о себе
              </h1>
              <p className="text-[#6B7280]">
                Эта информация поможет другим специалистам найти вас
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <Input
                label="Компания"
                placeholder="Google, Freelance..."
                icon={<Building2 size={20} />}
                value={formData.company}
                onChange={(e) => {
                  setFormData({ ...formData, company: e.target.value });
                  setErrors({ ...errors, company: '' });
                }}
                error={errors.company}
              />

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Категория <span className="text-[#EF4444]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, category: cat.value });
                        setErrors({ ...errors, category: '' });
                      }}
                      className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                        formData.category === cat.value
                          ? 'bg-[#2290FF] text-white border-[#2290FF] shadow-lg shadow-blue-500/30'
                          : 'bg-white text-[#1A1A1A] border-[#E5E7EB] hover:border-[#2290FF]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="mt-2 text-sm text-[#EF4444]">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                  Навыки
                </label>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 relative">
                    <Tag
                      size={20}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
                    />
                    <input
                      type="text"
                      placeholder="Добавьте навык и нажмите Enter"
                      className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2290FF] focus:outline-none transition-colors"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                  <Button type="button" onClick={handleAddSkill} variant="secondary">
                    Добавить
                  </Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-4 py-2 bg-gradient-to-r from-[#F0F9FF] to-[#E0F0FF] text-[#2290FF] rounded-xl font-medium flex items-center gap-2 border border-[#2290FF]/20 animate-in zoom-in duration-200"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-[#EF4444] transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" loading={loading} className="w-full mt-8">
                Продолжить
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
