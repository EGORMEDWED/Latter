import { useState, useEffect, useCallback, useRef } from 'react';
import { Search as SearchIcon, Filter } from 'lucide-react';
import type { NavigateFn } from '../routes';
import type { ProfileCategory, UserSearchResult } from '../types/api';
import { api } from '../services/api';
import { useApp } from '../contexts/AppContext';
import { urlParams } from '../utils/urlParams';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import SearchFilters from '../components/SearchFilters';
import UserCard from '../components/UserCard';

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 12;

interface SearchState {
  category?: ProfileCategory;
  company?: string;
  skills?: string[];
  page: number;
}

export default function Search({ onNavigate }: { onNavigate: NavigateFn }) {
  const { addToast } = useApp();

  // State management
  const [filters, setFilters] = useState<SearchState>(() => {
    const params = urlParams.parse();
    return {
      category: params.category,
      company: params.company,
      skills: params.skills,
      page: params.page || 1,
    };
  });

  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [companyOptions, setCompanyOptions] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Fetch companies for autocomplete
  const fetchCompanyOptions = useCallback(
    async (query: string) => {
      if (!query || query.length < 1) {
        setCompanyOptions([]);
        return;
      }

      try {
        const response = await api.users.searchUsers({
          company: query,
          limit: 5,
        });

        const uniqueCompanies = Array.from(
          new Set(response.users.map((user) => user.profile.company))
        );
        setCompanyOptions(uniqueCompanies);
      } catch {
        setCompanyOptions([]);
      }
    },
    []
  );

  // Fetch search results with debouncing
  const performSearch = useCallback(async (searchFilters: SearchState) => {
    setLoading(true);
    try {
      const offset = (searchFilters.page - 1) * PAGE_SIZE;
      const response = await api.users.searchUsers({
        category: searchFilters.category,
        company: searchFilters.company,
        skills: searchFilters.skills,
        limit: PAGE_SIZE,
        offset,
      });

      setUsers(response.users);
      setTotalCount(response.total);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Ошибка поиска';
      addToast('error', message);
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(filters);
      urlParams.update({
        category: filters.category,
        company: filters.company,
        skills: filters.skills,
        page: filters.page > 1 ? filters.page : undefined,
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, performSearch]);

  const handleFiltersChange = useCallback(
    (newFilters: {
      category?: ProfileCategory;
      company?: string;
      skills?: string[];
    }) => {
      setFilters((prev) => ({
        ...prev,
        ...newFilters,
        page: 1,
      }));
      setShowMobileFilters(false);
    },
    []
  );

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      category: undefined,
      company: undefined,
      skills: undefined,
      page: 1,
    });
    setCompanyOptions([]);
    urlParams.clear();
  }, []);

  const handleLoadMore = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      page: prev.page + 1,
    }));
  }, []);

  const handleChatCreated = useCallback(
    (chatId: string) => {
      onNavigate('/', { chatId });
    },
    [onNavigate]
  );

  const hasActiveFilters =
    filters.category || filters.company || (filters.skills && filters.skills.length > 0);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasMorePages = filters.page < totalPages;
  const isFirstPage = filters.page === 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FBFF] via-white to-[#F0F9FF]">
      {/* Header */}
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

      {/* Mobile filters button */}
      <div className="lg:hidden sticky top-16 z-20 bg-white border-b border-[#E5E7EB] px-6 py-3">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F6] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#E5E7EB] transition-colors"
        >
          <Filter size={18} />
          <span>Фильтры</span>
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-1 bg-[#2290FF] text-white rounded-md text-xs font-semibold">
              {(filters.skills?.length || 0) + (filters.category ? 1 : 0) + (filters.company ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="flex">
        {/* Desktop filters sidebar */}
        <div className="hidden lg:block w-80 bg-white border-r border-[#E5E7EB]">
          <div className="p-6">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              companyOptions={companyOptions}
              onCompanyOptionsChange={setCompanyOptions}
              hasActiveFilters={hasActiveFilters}
              onClearAll={handleClearAllFilters}
            />
          </div>
        </div>

        {/* Mobile filters overlay */}
        {showMobileFilters && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50">
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Фильтры</h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="text-[#6B7280] hover:text-[#1A1A1A]"
                  >
                    ✕
                  </button>
                </div>
                <SearchFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  companyOptions={companyOptions}
                  onCompanyOptionsChange={setCompanyOptions}
                  hasActiveFilters={hasActiveFilters}
                  onClearAll={handleClearAllFilters}
                />
              </div>
            </div>
          </div>
        )}

        {/* Search results */}
        <div className="flex-1 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">
              Поиск специалистов
            </h2>
            <p className="text-[#6B7280]">
              {totalCount > 0
                ? `Найдено ${totalCount} специалистов`
                : 'Специалисты не найдены'
              }
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2290FF]" />
            </div>
          ) : users.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onCreateChat={() => handleChatCreated}
                />
              ))}
            </div>
          ) : !isFirstPage ? (
            <div className="text-center py-12">
              <p className="text-[#6B7280] mb-4">Больше пользователей не найдено</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon size={48} className="text-[#E5E7EB] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">
                Начните поиск
              </h3>
              <p className="text-[#6B7280]">
                Используйте фильтры для поиска специалистов
              </p>
            </div>
          )}

          {hasMorePages && users.length > 0 && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleLoadMore}
                variant="secondary"
                disabled={loading}
              >
                Загрузить ещё
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
