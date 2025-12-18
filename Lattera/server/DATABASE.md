# MongoDB Database Integration для Lettera

## 📋 Описание

Реализована полная интеграция MongoDB через Mongoose для backend-сервера Lettera. Включает в себя настроенную конфигурацию подключения, создание всех необходимых моделей данных согласно архитектуре БД, настройку индексов и валидации.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd server
npm install
```

### 2. Настройка переменных окружения

Скопируйте файл с примерами переменных окружения:

```bash
cp .env.example .env
```

Отредактируйте файл `.env` и укажите ваши настройки подключения к MongoDB:

```env
# MongoDB Connection URI
MONGODB_URI=mongodb://localhost:27017/lettera

# Для production используйте:
# MONGODB_URI=mongodb://username:password@localhost:27017/lettera?authSource=admin

# Connection Pool Settings
DB_MAX_POOL_SIZE=10
DB_MIN_POOL_SIZE=2

# Timeout Settings (в миллисекундах)
DB_SERVER_SELECTION_TIMEOUT=5000
DB_SOCKET_TIMEOUT=45000
DB_CONNECT_TIMEOUT=10000

# Application Settings
NODE_ENV=development
PORT=3000
```

### 3. Запуск с подключением к базе данных

```bash
# Запуск в режиме разработки
npm run dev

# Запуск production версии
npm run build
npm start
```

### 4. Проверка работы базы данных

```bash
# Запуск тестов базы данных
npm run test-db
```

## 📊 Модели данных

### 1. User Model (Пользователи)

```typescript
import { User } from './database';

interface IUser {
  email: string;                    // Уникальный email
  passwordHash: string;             // bcrypt hash (мин. 60 символов)
  firstName: string;                // Имя
  lastName: string;                 // Фамилия
  avatarUrl?: string;               // URL аватара
  profile?: {                       // Профиль
    position?: string;              // Должность
    company?: string;               // Компания
    category?: 'IT' | 'Marketing' | 'Design' | 'Finance' | 'Other';
    skills?: string[];              // Навыки
  };
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Индексы:**
- `email` - уникальный индекс
- Text index на `profile.company`, `profile.skills`, `firstName`, `lastName`
- Одиночные индексы на `profile.category`, `status`, `lastSeen`

### 2. Chat Model (Чаты)

```typescript
import { Chat } from './database';

interface IChat {
  type: 'private';                  // Только private чаты
  participants: ObjectId[];         // 2 участника
  lastMessage?: {                   // Последнее сообщение
    content: string;
    senderId: ObjectId;
    timestamp: Date;
  };
  unreadCount: Map<string, number>; // Счетчики непрочитанных
  createdAt: Date;
  updatedAt: Date;
}
```

**Индексы:**
- Unique sparse index на `participants`
- Одиночный индекс на `participants`
- Индекс на `updatedAt`

### 3. Message Model (Сообщения)

```typescript
import { Message } from './database';

interface IMessage {
  chatId: ObjectId;                 // Ссылка на чат
  senderId: ObjectId;               // Отправитель
  content: string;                  // Текст сообщения
  media?: {                         // Медиа (опционально)
    type: 'image' | 'audio' | 'video';
    url: string;
    metadata?: {
      duration?: number;
      width?: number;
      height?: number;
    };
  };
  editedAt?: Date;                  // Время редактирования
  deletedFor: ObjectId[];           // Soft delete список
  timestamp: Date;                  // Время отправки
  feedbackRequested: boolean;       // Запрос обратной связи
}
```

**Индексы:**
- Compound index `chatId + timestamp`
- Одиночные индексы на `senderId`, `feedbackRequested + timestamp`

### 4. FeedbackRequest Model (Запросы обратной связи)

```typescript
import { FeedbackRequest } from './database';

interface IFeedbackRequest {
  messageId: ObjectId;              // Ссылка на сообщение
  requesterId: ObjectId;            // Кто запросил
  responderId: ObjectId;            // Кого ждут ответ
  chatId: ObjectId;                 // Ссылка на чат
  status: 'pending' | 'responded' | 'expired';
  requestedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;                  // +7 дней
}
```

**Индексы:**
- Unique index на `messageId`
- Compound индексы для быстрого поиска
- TTL индекс на `expiresAt` (30 дней)

### 5. SearchHistory Model (История поиска)

```typescript
import { SearchHistory } from './database';

interface ISearchHistory {
  userId: ObjectId;
  query: {                          // Параметры поиска
    category?: string;
    company?: string;
    skills?: string[];
  };
  resultsCount: number;             // Количество результатов
  timestamp: Date;
}
```

**Индексы:**
- Compound индекс `userId + timestamp`
- TTL индекс на `timestamp` (90 дней)

### 6. OnlineStatus Model (Статус онлайн)

```typescript
import { OnlineStatus } from './database';

interface IOnlineStatus {
  userId: ObjectId;
  status: 'online' | 'away';
  lastPing: Date;
}
```

**Индексы:**
- Unique index на `userId`
- TTL индекс на `lastPing` (5 минут)

## 🛠️ API использования

### Подключение к базе данных

```typescript
import { connectDB, disconnectDB, getConnectionState } from './database';

// Подключение
await connectDB();

// Проверка состояния
const state = getConnectionState();
console.log('Connected:', state.readyState === 1);

// Отключение
await disconnectDB();
```

### Создание пользователя

```typescript
import { User } from './database';

const user = new User({
  email: 'user@example.com',
  passwordHash: 'bcrypt_hash_min_60_chars',
  firstName: 'Иван',
  lastName: 'Петров',
  profile: {
    position: 'Разработчик',
    company: 'TechCorp',
    category: 'IT',
    skills: ['JavaScript', 'React', 'TypeScript']
  }
});

const savedUser = await user.save();
```

### Создание чата

```typescript
import { Chat } from './database';

const chat = new Chat({
  type: 'private',
  participants: [user1Id, user2Id],
  lastMessage: {
    content: 'Привет!',
    senderId: user1Id,
    timestamp: new Date()
  }
});

const savedChat = await chat.save();
```

### Поиск пользователей

```typescript
// Текстовый поиск
const users = await User.find(
  { $text: { $search: 'React разработчик' } },
  { score: { $meta: 'textScore' } }
).sort({ score: { $meta: 'textScore' } });

// Поиск по категории и навыкам
const developers = await User.find({
  'profile.category': 'IT',
  'profile.skills': { $in: ['React'] }
});

// Поиск онлайн пользователей
const onlineUsers = await User.find({ status: 'online' });
```

### Работа с сообщениями

```typescript
import { Message } from './database';

// Создание сообщения
const message = new Message({
  chatId: chatId,
  senderId: userId,
  content: 'Привет!',
  feedbackRequested: true
});

const savedMessage = await message.save();

// Получение истории чата
const messages = await Message.find({ chatId })
  .sort({ timestamp: -1 })
  .limit(50)
  .populate('senderId', 'firstName lastName');

// Soft delete для пользователя
await message.deleteForUser(userId);
```

## 📈 Индексы и производительность

### Создание индексов

Индексы создаются автоматически при запуске сервера. Также можно создать их вручную:

```typescript
import { createIndexes } from './database';

await createIndexes();
```

### Статистика индексов

```typescript
import { getIndexesStats } from './database';

const stats = await getIndexesStats();
console.log(stats);
```

### TTL индексы (автоочистка)

- **feedbackRequests** - автоматическое удаление через 30 дней после `expiresAt`
- **searchHistory** - автоматическое удаление через 90 дней
- **onlineStatus** - автоматическое удаление через 5 минут

## 🔍 Валидация

### Email валидация

```typescript
// RFC-совместимый паттерн email
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
```

### Password валидация

```typescript
// Минимальная длина для bcrypt hash
minlength: 60
```

### Enum валидация

```typescript
// Статусы пользователей
status: 'online' | 'offline' | 'away'

// Категории
category: 'IT' | 'Marketing' | 'Design' | 'Finance' | 'Other'

// Типы медиа
media.type: 'image' | 'audio' | 'video'

// Статусы запросов
status: 'pending' | 'responded' | 'expired'
```

## 🔧 Настройки подключения

### Production настройки

```typescript
const options: mongoose.ConnectOptions = {
  // Connection pool
  maxPoolSize: 10,     // Максимум соединений
  minPoolSize: 2,      // Минимум соединений
  
  // Timeouts
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  
  // Retry
  retryWrites: true,
  retryReads: true,
  
  // Performance
  autoIndex: false,    // Отключаем автосоздание индексов в production
  
  // Write concern
  writeConcern: { w: 'majority' },
  readConcern: { level: 'majority' }
};
```

### Development настройки

```typescript
const options: mongoose.ConnectOptions = {
  autoIndex: true,     // Включаем автосоздание индексов
  writeConcern: { w: 0 },
  readConcern: { level: 'local' }
};
```

## 📡 Health checks

### Общий health check

```bash
GET /api/health
```

**Ответ:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "message": "Lettera Server is healthy!",
  "environment": "development",
  "database": {
    "connected": true,
    "host": "localhost",
    "port": 27017,
    "name": "lettera",
    "readyState": 1
  }
}
```

### Database health check

```bash
GET /api/health/db
```

**Ответ:**
```json
{
  "database": {
    "connected": true,
    "readyState": 1,
    "readyStateText": "connected",
    "host": "localhost",
    "port": 27017,
    "name": "lettera",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🧪 Тестирование

### Запуск тестов базы данных

```bash
npm run test-db
```

Тесты включают:
- ✅ Подключение к базе данных
- ✅ Создание индексов
- ✅ Создание пользователей
- ✅ Создание чатов и сообщений
- ✅ Запросы обратной связи
- ✅ История поиска
- ✅ Статусы онлайн
- ✅ Populate запросы
- ✅ Статистика

## 🔧 Troubleshooting

### Проблемы подключения

1. **MongoDB не запущен**
   ```bash
   # Ubuntu/Debian
   sudo systemctl start mongod
   
   # macOS
   brew services start mongodb-community
   ```

2. **Неверный URI подключения**
   - Проверьте переменную `MONGODB_URI` в `.env`
   - Убедитесь что порт доступен
   - Проверьте аутентификацию

3. **Проблемы с индексами**
   ```bash
   # Пересоздать все индексы
   npm run test-db  # Автоматически создаст индексы
   
   # Или вручную
   node -e "require('./dist/test-db').default()"
   ```

### Логи подключения

При успешном подключении вы увидите:

```
🔄 Connecting to MongoDB...
📍 Database URI: mongodb://***:***@localhost:27017/lettera
⚙️  Connection pool: 2-10 connections
✅ MongoDB: Successfully connected to database
🗄️  Database name: lettera
📊 Connection state: Connected
🔍 Starting to create database indexes...
📊 Creating indexes for users collection...
✅ Users indexes synced: 5 indexes
...
🎉 All database indexes created successfully!
```

## 📚 Дополнительная документация

- [Mongoose Documentation](https://mongoosejs.com/docs/guide.html)
- [MongoDB Index Documentation](https://docs.mongodb.com/manual/indexes/)
- [MongoDB Connection String URI](https://docs.mongodb.com/manual/reference/connection-string/)

## 🤝 Контрибьюция

При добавлении новых моделей:

1. Следуйте архитектуре БД из документации
2. Добавляйте валидацию в схемы
3. Определяйте необходимые индексы
4. Обновляйте тесты
5. Документируйте новые модели

---

**Примечание:** Данная интеграция полностью соответствует архитектуре базы данных Lettera, включая все модели, индексы, валидацию и настройки производительности.