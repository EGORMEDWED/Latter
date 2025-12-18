# Logging and Error Handling

Система логирования и централизованной обработки ошибок для Lettera Backend.

## 📋 Обзор

Проект использует **Winston** для логирования и централизованный error handler для единообразной обработки ошибок.

### Основные компоненты

1. **Logger** (`src/utils/logger.ts`) - Winston logger с поддержкой разных уровней логирования
2. **HttpError** (`src/utils/HttpError.ts`) - Кастомный класс ошибок для HTTP
3. **Request Logger** (`src/middleware/requestLogger.ts`) - Middleware для логирования HTTP-запросов
4. **Error Handler** (`src/middleware/errorHandler.ts`) - Централизованный обработчик ошибок
5. **Async Handler** (`src/utils/asyncHandler.ts`) - Обертка для async функций

## 🔧 Конфигурация

### Logger

Winston настроен со следующими параметрами:

- **Уровни логирования**: `error`, `warn`, `info`, `http`, `debug`
- **Транспорты**:
  - Console (с цветным выводом для development)
  - File `logs/error-YYYY-MM-DD.log` (только errors)
  - File `logs/combined-YYYY-MM-DD.log` (все логи)
  - File `logs/exceptions-YYYY-MM-DD.log` (неперехваченные исключения)
  - File `logs/rejections-YYYY-MM-DD.log` (rejected promises)
- **Ротация**: Ежедневная, максимум 20MB на файл, хранение 14 дней

### Уровни логирования

```typescript
// Production: info и выше
// Development: debug и выше

logger.error('Critical error');  // 0 - Критические ошибки
logger.warn('Warning message');  // 1 - Предупреждения
logger.info('Info message');     // 2 - Информация
logger.http('HTTP request');     // 3 - HTTP запросы
logger.debug('Debug info');      // 4 - Отладка
```

## 📝 Использование Logger

### Базовое использование

```typescript
import logger from './utils/logger';

logger.info('Server started on port 3000');
logger.error('Database connection failed', { error });
logger.debug('Request body', { body: req.body });
logger.warn('Rate limit exceeded', { ip: req.ip });
```

### С метаданными

```typescript
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
});

logger.error('Payment failed', {
  orderId: '123',
  amount: 100,
  error: error.message,
  stack: error.stack,
});
```

## 🚨 HttpError класс

### Создание ошибок

```typescript
import {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  UnprocessableEntityError,
  InternalServerError,
} from './utils/HttpError';

// Базовый способ
throw new HttpError(400, 'Invalid input', 'INVALID_INPUT');

// Предопределенные ошибки
throw new BadRequestError('Missing required field');
throw new UnauthorizedError('Invalid token');
throw new NotFoundError('User not found', 'USER_NOT_FOUND');
throw new PayloadTooLargeError('File too large');
```

### В контроллерах

```typescript
import { asyncHandler, NotFoundError, BadRequestError } from '../utils';

router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw new BadRequestError('Invalid user ID', 'INVALID_USER_ID');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    res.json({ success: true, data: user });
  })
);
```

## 🔍 Request Logger

Автоматически логирует все HTTP-запросы:

```
[2024-01-15 10:30:45] http: Incoming request {
  requestId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  method: "POST",
  url: "/api/users",
  ip: "127.0.0.1",
  userAgent: "Mozilla/5.0..."
}

[2024-01-15 10:30:45] debug: Request body {
  requestId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  body: {
    email: "user@example.com",
    password: "***REDACTED***"
  }
}

[2024-01-15 10:30:46] http: Request completed {
  requestId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  method: "POST",
  url: "/api/users",
  statusCode: 201,
  responseTime: "125ms"
}
```

### Чувствительные поля

Следующие поля автоматически скрываются в логах:
- `password`
- `token`
- `accessToken`
- `refreshToken`
- `authorization`
- `secret`
- `apiKey`
- `creditCard`
- `cvv`

## ⚠️ Error Handler

Централизованная обработка всех типов ошибок:

### Обрабатываемые типы ошибок

1. **HttpError** - Кастомные HTTP ошибки
2. **Mongoose ValidationError** - Ошибки валидации Mongoose
3. **Mongoose CastError** - Некорректные ObjectId
4. **MongoDB Duplicate Key** - Дубликаты уникальных полей
5. **JsonWebTokenError** - Невалидный JWT
6. **TokenExpiredError** - Истекший JWT
7. **MulterError** - Ошибки загрузки файлов
8. **S3 Errors** - Ошибки AWS S3/MinIO
9. **MongoDB Connection Errors** - Ошибки подключения к БД

### Формат ответа

```json
{
  "error": {
    "message": "Пользователь не найден",
    "code": "USER_NOT_FOUND",
    "statusCode": 404,
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "stack": "Error: User not found\n    at..." // только в development
  }
}
```

### Примеры ответов на ошибки

**Mongoose ValidationError:**
```json
{
  "error": {
    "message": "Ошибка валидации данных",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "requestId": "...",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

**JWT Error:**
```json
{
  "error": {
    "message": "Недействительный токен",
    "code": "INVALID_TOKEN",
    "statusCode": 401,
    "requestId": "..."
  }
}
```

**Multer Error:**
```json
{
  "error": {
    "message": "Размер файла слишком большой",
    "code": "FILE_TOO_LARGE",
    "statusCode": 413,
    "requestId": "..."
  }
}
```

## 🔄 Async Handler

Автоматическая обработка ошибок в async функциях:

```typescript
import { asyncHandler } from '../utils';

// Без asyncHandler (нужен try-catch)
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// С asyncHandler (автоматический перехват ошибок)
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json({ users });
}));
```

## 📊 Request ID

Каждый запрос получает уникальный `requestId` для трейсинга:

```typescript
// В middleware и обработчиках доступен через req.requestId
app.get('/test', (req, res) => {
  logger.info('Processing request', { requestId: req.requestId });
  res.json({ requestId: req.requestId });
});
```

## 🗂️ Структура логов

```
server/
├── logs/
│   ├── error-2024-01-15.log         # Только ошибки
│   ├── combined-2024-01-15.log      # Все логи
│   ├── exceptions-2024-01-15.log    # Неперехваченные исключения
│   └── rejections-2024-01-15.log    # Rejected promises
```

## 🔧 Best Practices

### 1. Всегда используйте HttpError в контроллерах

```typescript
// ❌ Плохо
throw new Error('User not found');

// ✅ Хорошо
throw new NotFoundError('User not found', 'USER_NOT_FOUND');
```

### 2. Используйте asyncHandler для async routes

```typescript
// ❌ Плохо
router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// ✅ Хорошо
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

### 3. Логируйте с правильным уровнем

```typescript
logger.debug('Cache hit', { key });           // Отладочная информация
logger.info('User registered', { userId });   // Важные события
logger.warn('Rate limit approaching', { ip }); // Предупреждения
logger.error('Database error', { error });    // Ошибки
```

### 4. Добавляйте контекст в логи

```typescript
// ❌ Плохо
logger.error('Error');

// ✅ Хорошо
logger.error('Failed to create user', {
  email: req.body.email,
  error: error.message,
  stack: error.stack,
  requestId: req.requestId,
});
```

### 5. Используйте коды ошибок

```typescript
// ❌ Плохо
throw new NotFoundError('Not found');

// ✅ Хорошо
throw new NotFoundError('User not found', 'USER_NOT_FOUND');
```

## 🚀 Production готовность

### Чек-лист

- ✅ Все ошибки обрабатываются централизованно
- ✅ Логи записываются в файлы с ротацией
- ✅ Чувствительные данные скрываются
- ✅ Request ID для трейсинга
- ✅ Неперехваченные исключения логируются
- ✅ Rejected promises обрабатываются
- ✅ Stack traces только в development
- ✅ Graceful shutdown

### Environment переменные

```env
NODE_ENV=production  # info и выше в логах
NODE_ENV=development # debug и выше в логах
```

## 📚 Примеры

### Полный пример контроллера

```typescript
import { Router } from 'express';
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils';
import { User } from '../database/models/User';
import logger from '../utils/logger';

const router = Router();

router.post('/users', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('Email and password are required', 'MISSING_FIELDS');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User already exists', 'USER_EXISTS');
  }

  const user = await User.create({ email, password });

  logger.info('User created', {
    userId: user._id,
    email: user.email,
    requestId: req.requestId,
  });

  res.status(201).json({
    success: true,
    data: { userId: user._id },
  });
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: user,
  });
}));

export default router;
```

## 🐛 Debugging

### Просмотр логов

```bash
# Все логи
tail -f logs/combined-*.log

# Только ошибки
tail -f logs/error-*.log

# Поиск по requestId
grep "a1b2c3d4-e5f6-7890" logs/combined-*.log

# Последние 100 строк
tail -n 100 logs/combined-*.log
```

### Фильтрация по уровню

```bash
# Только ошибки и предупреждения
grep -E '"level":"(error|warn)"' logs/combined-*.log | jq
```

## 📞 Поддержка

При возникновении проблем с логированием или обработкой ошибок:

1. Проверьте права доступа к директории `logs/`
2. Убедитесь, что Winston установлен корректно
3. Проверьте `NODE_ENV` для правильного уровня логирования
4. Используйте `requestId` для трейсинга проблемных запросов
