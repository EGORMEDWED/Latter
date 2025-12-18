import { useState } from 'react';
import { Search as SearchIcon, X, Filter } from 'lucide-react';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';

interface User {
  id: string;
  name: string;
  avatar: string;
  position: string;
  company: string;
  category: string;
  skills: string[];
}

const CATEGORIES = [
  'Все',
  'IT & Разработка',
  'Маркетинг',
  'Дизайн',
  'Финансы',
  'Продажи',
  'HR',
];

const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Анна Смирнова',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=200',
    position: 'Frontend Developer',
    company: 'Yandex',
    category: 'IT & Разработка',
    skills: ['React', 'TypeScript', 'Tailwind'],
  },
  {
    id: '2',
    name: 'Дмитрий Волков',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=200',
    position: 'UI/UX Designer',
    company: 'Figma',
    category: 'Дизайн',
    skills: ['Figma', 'Prototyping', 'User Research'],
  },
  {
    id: '3',
    name: 'Екатерина Петрова',
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?w=200',
    position: 'Marketing Manager',
    company: 'Google',
    category: 'Маркетинг',
    skills: ['SEO', 'Content Marketing', 'Analytics'],
  },
  {
    id: '4',
    name: 'Алексей Иванов',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=200',
    position: 'Backend Developer',
    company: 'VK',
    category: 'IT & Разработка',
    skills: ['Node.js', 'PostgreSQL', 'Docker'],
  },
  {
    id: '5',
    name: 'Мария Соколова',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=200',
    position: 'Product Designer',
    company: 'Spotify',
    category: 'Дизайн',
    skills: ['Design Systems', 'Mobile Design', 'Branding'],
  },
  {
    id: '6',
    name: 'Игорь Новиков',
    avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=200',
    position: 'Financial Analyst',
    company: 'Sberbank',
    category: 'Финансы',
    skills: ['Financial Modeling', 'Excel', 'Risk Analysis'],
  },
];

export default function Search({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [companyFilter, setCompanyFilter] = useState('');
  const [skillsFilter, setSkillsFilter] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skillsFilter.includes(trimmed)) {
      setSkillsFilter([...skillsFilter, trimmed]);
      setSkillInput('');
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory('Все');
    setCompanyFilter('');
    setSkillsFilter([]);
  };

  const filteredUsers = MOCK_USERS.filter((user) => {
    if (selectedCategory !== 'Все' && user.category !== selectedCategory) return false;
    if (companyFilter && !user.company.toLowerCase().includes(companyFilter.toLowerCase()))
      return false;
    if (
      skillsFilter.length > 0 &&
      !skillsFilter.some((skill) =>
        user.skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()))
      )
    )
      return false;
    return true;
  });

  const hasActiveFilters = selectedCategory !== 'Все' || companyFilter || skillsFilter.length > 0;

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
            className="px-4 py-2 text-[#2290FF] bg-[#F0F9FF] rounded-lg font-medium"
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

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">
            Найти профессионала
          </h1>
          <p className="text-lg text-[#6B7280]">
            Используйте фильтры для поиска нужного специалиста
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-blue-500/5 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-[#6B7280]">
              <Filter size={20} />
              <span className="font-medium">Фильтры</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
              >
                <X size={18} />
                <span className="text-sm font-medium">Сбросить всё</span>
              </button>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
                Категория
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#2290FF] text-white shadow-lg shadow-blue-500/30'
                        : 'bg-[#F3F4F6] text-[#1A1A1A] hover:bg-[#E5E7EB]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
                Компания
              </label>
              <div className="relative max-w-md">
                <SearchIcon
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                />
                <input
                  type="text"
                  placeholder="Google, Yandex, Freelance..."
                  className="w-full h-12 pl-10 pr-4 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2290FF] focus:outline-none transition-colors"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
                Навыки
              </label>
              <div className="flex gap-2 mb-3 max-w-md">
                <input
                  type="text"
                  placeholder="Введите навык..."
                  className="flex-1 h-12 px-4 rounded-xl border-2 border-[#E5E7EB] focus:border-[#2290FF] focus:outline-none transition-colors"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                />
                <Button onClick={handleAddSkill} variant="secondary">
                  Добавить
                </Button>
              </div>
              {skillsFilter.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skillsFilter.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 bg-[#F0F9FF] text-[#2290FF] rounded-lg text-sm font-medium flex items-center gap-2 border border-[#2290FF]/20"
                    >
                      {skill}
                      <button
                        onClick={() =>
                          setSkillsFilter(skillsFilter.filter((s) => s !== skill))
                        }
                        className="hover:text-[#EF4444] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[#6B7280]">
            Найдено специалистов:{' '}
            <span className="font-semibold text-[#1A1A1A]">{filteredUsers.length}</span>
          </p>
        </div>

        {filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-2xl shadow-lg shadow-blue-500/5 p-6 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1A1A1A] mb-1 truncate">
                      {user.name}
                    </h3>
                    <p className="text-sm text-[#6B7280] truncate">{user.position}</p>
                    <p className="text-sm text-[#2290FF] font-medium truncate">
                      {user.company}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-[#E0F0FF] text-[#2290FF] rounded-lg text-xs font-medium">
                    {user.category}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {user.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 bg-[#F0F9FF] text-[#2290FF] rounded-md text-xs font-medium border border-[#2290FF]/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <Button variant="primary" className="w-full">
                  Написать
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-[#F3F4F6] rounded-3xl flex items-center justify-center mx-auto mb-6">
              <SearchIcon size={48} className="text-[#6B7280]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
              Ничего не найдено
            </h2>
            <p className="text-[#6B7280] mb-6">
              Попробуйте изменить фильтры или сбросить их
            </p>
            <Button onClick={handleClearFilters} variant="secondary">
              Сбросить фильтры
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
