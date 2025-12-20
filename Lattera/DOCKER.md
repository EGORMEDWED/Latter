# Docker Deployment Guide

Этот проект настроен для запуска в Docker контейнерах с полной оркестрацией через docker-compose.

## Архитектура

Проект состоит из следующих сервисов:

- **Server** (Node.js/Express) - API сервер на порту 3000
- **Client** (React/Vite) - фронтенд приложение на порту 3001  
- **CRM Client** (React/Vite) - админ-панель на порту 3002
- **MongoDB** - база данных на порту 27017
- **Redis** - кэш на порту 6379
- **MinIO** (опционально) - S3-совместимое хранилище на порту 9000

## Быстрый старт

### 1. Клонирование и запуск

```bash
# Перейдите в директорию проекта
cd Lattera

# Запустите все сервисы
docker-compose up -d
```

### 2. Проверка запуска

```bash
# Проверьте статус всех сервисов
docker-compose ps

# Посмотрите логи
docker-compose logs -f
```

### 3. Доступ к приложениям

- **Клиент**: http://localhost:3001
- **API Сервер**: http://localhost:3000
- **CRM Панель**: http://localhost:3002
- **API Документация**: http://localhost:3000/api-docs
- **MinIO Console**: http://localhost:9001 (если включен)

## Команды Docker

### Управление сервисами

```bash
# Запуск всех сервисов
docker-compose up -d

# Запуск конкретного сервиса
docker-compose up -d server

# Остановка всех сервисов
docker-compose down

# Пересборка и запуск
docker-compose up --build

# Просмотр логов
docker-compose logs -f [service_name]

# Перезапуск сервиса
docker-compose restart [service_name]
```

### Управление данными

```bash
# Удаление всех данных (включая volumes)
docker-compose down -v

# Очистка неиспользуемых образов
docker system prune -a

# Просмотр использования диска
docker system df
```

### Разработка

```bash
# Режим разработки с hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Доступ к shell контейнера
docker-compose exec server sh
docker-compose exec client sh
docker-compose exec mongodb mongosh
```

## Конфигурация

### Переменные окружения

Основные переменные окружения настраиваются в `docker-compose.yml`:

- `MONGODB_URI` - строка подключения к MongoDB
- `REDIS_URL` - строка подключения к Redis  
- `FRONTEND_URL` - URL фронтенда для CORS
- `JWT_ACCESS_SECRET` - секретный ключ для JWT токенов

### Настройка базы данных

MongoDB автоматически инициализируется с:
- База данных: `lettera`
- Пользователь: `lettera_app`
- Коллекции: `users`, `chats`, `messages`
- Индексы для оптимальной производительности

### Порт и сеть

Все сервисы работают в общей Docker сети `lettera-network`:
- Порт 3000: API Server
- Порт 3001: Client SPA
- Порт 3002: CRM Client SPA  
- Порт 27017: MongoDB
- Порт 6379: Redis
- Порт 9000/9001: MinIO

## Мониторинг

### Health Checks

Все сервисы настроены с health checks:

```bash
# Проверка здоровья сервисов
docker-compose ps

# Ручная проверка health check
docker-compose exec server curl -f http://localhost:3000/api/health
```

### Логи

```bash
# Логи всех сервисов
docker-compose logs

# Логи конкретного сервиса
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f mongodb
```

## Production Deployment

### Оптимизация

1. **Multi-stage builds** - минимизированные образы
2. **Health checks** - автоматический мониторинг
3. **Resource limits** - контроль использования ресурсов
4. **Volume persistence** - сохранение данных между перезапусками

### Безопасность

1. **Непривилегированные пользователи** в контейнерах
2. **Отдельные сети** для сервисов
3. **Секретные переменные** окружения
4. **TLS/HTTPS** для production

## Устранение неполадок

### Проблемы с подключением

```bash
# Проверьте сетевые подключения
docker network ls
docker network inspect lettera_letteranetwork

# Проверьте DNS resolution
docker-compose exec client nslookup server
docker-compose exec client ping server
```

### Проблемы с базой данных

```bash
# Подключение к MongoDB
docker-compose exec mongodb mongosh -u lettera_app -p lettera_app_password --authenticationDatabase lettera

# Проверка коллекций
use lettera
show collections
db.users.count()
```

### Проблемы с Redis

```bash
# Подключение к Redis
docker-compose exec redis redis-cli -a redis_password

# Проверка ключей
docker-compose exec redis redis-cli -a redis_password keys *
```

## Дополнительно

### MinIO Setup (опционально)

MinIO предоставляет S3-совместимое хранилище для медиафайлов:

```bash
# Доступ к MinIO Console
open http://localhost:9001

# Данные для входа:
# Username: lettera_admin
# Password: lettera_minio_password
```

### Масштабирование

```bash
# Масштабирование сервисов
docker-compose up -d --scale server=3

# Балансировка нагрузки (требует дополнительной настройки nginx)
```

---

**При возникновении проблем проверьте:**
1. Порты не заняты другими процессами
2. Docker daemon запущен
3. Достаточно свободного места на диске
4. Переменные окружения настроены корректно