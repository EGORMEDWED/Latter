# S3/MinIO Media Upload Integration

Данная документация описывает интеграцию системы загрузки медиафайлов с S3/MinIO в Lettera.

## Обзор

Система поддерживает загрузку медиафайлов в облачное хранилище (AWS S3) или локальное хранилище (MinIO для development) с полным управлением метаданными и валидацией.

## Поддерживаемые форматы файлов

### Изображения
- **Типы**: JPEG, PNG, WebP
- **Максимальный размер**: 10 МБ
- **MIME-типы**: 
  - `image/jpeg`
  - `image/png` 
  - `image/webp`

### Аудио
- **Типы**: MP3, WAV, OGG
- **Максимальный размер**: 2 МБ
- **MIME-типы**:
  - `audio/mpeg`
  - `audio/wav`
  - `audio/ogg`

### Видео
- **Типы**: MP4, WebM
- **Максимальный размер**: 100 МБ
- **MIME-типы**:
  - `video/mp4`
  - `video/webm`

## Конфигурация

### Переменные окружения

Добавьте следующие переменные в ваш `.env` файл:

```bash
# S3/MinIO Configuration
AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET=lettera-media

# MinIO Support (for self-hosted development)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false

# File Upload Settings
MAX_IMAGE_SIZE=10485760  # 10MB
MAX_AUDIO_SIZE=2097152   # 2MB
MAX_VIDEO_SIZE=104857600 # 100MB
```

### Настройка MinIO (Development)

Для локальной разработки используйте MinIO:

1. **Запуск MinIO**:
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ACCESS_KEY=minioadmin" \
  -e "MINIO_SECRET_KEY=minioadmin" \
  -v $(pwd)/minio_data:/data \
  minio/minio server /data --console-address ":9001"
```

2. **Создание bucket**:
```bash
mc mb lettera-media
```

3. **Настройка CORS** для MinIO:
```bash
mc cors set lettera-media / '{
  "CORSRule": [
    {
      "AllowedOrigins": ["http://localhost:3000", "http://localhost:3001"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'
```

## API Endpoints

### 1. Загрузка файла
**POST** `/api/media/upload`

**Headers**:
- `Content-Type: multipart/form-data`

**Form Data**:
- `file`: Файл для загрузки
- `userId`: ID пользователя (в production получается из JWT токена)

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.region.amazonaws.com/user123/1640995200000-abc123.jpg",
    "key": "user123/1640995200000-abc123.jpg",
    "type": "image",
    "size": 1048576,
    "mimeType": "image/jpeg",
    "uploadedAt": "2023-12-31T18:00:00.000Z"
  }
}
```

### 2. Удаление файла
**DELETE** `/api/media/{encodedUrl}`

**Headers**:
- `userId`: ID пользователя (опционально, для проверки прав доступа)

**Response**:
```json
{
  "success": true,
  "message": "Файл успешно удален"
}
```

### 3. Получение временного URL
**GET** `/api/media/presigned/{key}?expiresIn=3600`

**Query Parameters**:
- `expiresIn`: Время жизни ссылки в секундах (по умолчанию 3600)

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.s3.region.amazonaws.com/user123/1640995200000-abc123.jpg?X-Amz-Signature=...",
    "expiresIn": 3600
  }
}
```

### 4. Статистика файлов пользователя
**GET** `/api/media/user/{userId}/stats`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalFiles": 15,
    "totalSize": 15728640,
    "filesByType": {
      "image": 10,
      "audio": 3,
      "video": 2
    }
  }
}
```

### 5. Список файлов пользователя
**GET** `/api/media/user/{userId}/files?page=1&limit=20&type=image`

**Query Parameters**:
- `page`: Номер страницы (по умолчанию 1)
- `limit`: Количество файлов на странице (по умолчанию 20, максимум 100)
- `type`: Тип файла (`image`, `audio`, `video`) - опционально

**Response**:
```json
{
  "success": true,
  "data": {
    "files": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

## Использование в коде

### Сервис S3Service

```typescript
import { s3Service } from './database/services/S3Service';
import { Types } from 'mongoose';

// Загрузка файла
const result = await s3Service.uploadFile(
  fileBuffer,          // Buffer файла
  'image/jpeg',        // MIME-тип
  'userId123',         // ID пользователя
  'my-photo.jpg'       // Опциональное оригинальное имя
);

// Генерация временного URL
const presignedUrl = await s3Service.generatePresignedUrl(
  'userId/1640995200000-abc123.jpg',
  3600 // 1 час
);

// Удаление файла
await s3Service.deleteFile('https://.../file-url.jpg');

// Проверка существования файла
const exists = await s3Service.fileExists('userId/file-key.jpg');

// Получение статистики пользователя
const stats = await s3Service.getUserFileStats('userId123');
```

### Модель MediaFile

```typescript
import { MediaFile } from './database/models/MediaFile';

// Поиск файлов пользователя
const files = await MediaFile.find({
  uploadedBy: new Types.ObjectId('userId')
}).sort({ uploadedAt: -1 });

// Фильтрация по типу
const images = await MediaFile.find({
  uploadedBy: new Types.ObjectId('userId'),
  type: 'image'
});

// Получение общего размера файлов
const totalSize = await MediaFile.aggregate([
  { $match: { uploadedBy: new Types.ObjectId('userId') } },
  { $group: { _id: null, total: { $sum: '$size' } } }
]);
```

## Безопасность

### Валидация
- Проверка MIME-типов файлов
- Ограничения по размеру файлов
- Генерация уникальных ключей для предотвращения коллизий

### Авторизация
- Проверка прав пользователя на удаление файлов
- Временные URL для безопасного доступа к файлам
- Идентификация пользователей через JWT токены (рекомендуется)

### Хранение
- Уникальные пути файлов: `{userId}/{timestamp}-{randomHash}.{ext}`
- Автоматическое удаление метаданных при удалении файлов
- Оптимизированные индексы MongoDB для быстрого поиска

## Производительность

### Оптимизации
- **Кэширование**: Cache-Control заголовки для статических файлов
- **CDN Ready**: Поддержка CloudFront и других CDN
- **Индексация**: Comprehensive MongoDB indexes
- **Пагинация**: Ограничение количества файлов в ответах

### Мониторинг
- Логирование всех операций с файлами
- Отслеживание размера загружаемых файлов
- Статистика использования хранилища

## Миграция с локального хранилища

Если у вас есть существующие файлы в локальном хранилище:

```typescript
// Миграция файлов в S3
const migrateLocalFiles = async () => {
  const localFiles = fs.readdirSync('./uploads');
  
  for (const file of localFiles) {
    const fileBuffer = fs.readFileSync(`./uploads/${file}`);
    const mimeType = getMimeType(file); // определите MIME-тип
    
    await s3Service.uploadFile(
      fileBuffer,
      mimeType,
      'migrated-user-id',
      file
    );
  }
};
```

## Устранение неполадок

### Частые ошибки

1. **Ошибка размера файла**: Увеличьте лимиты в переменных окружения
2. **CORS ошибки**: Настройте CORS политики для S3/MinIO
3. **Ошибка подключения**: Проверьте переменные окружения и доступность S3
4. **MIME-тип не поддерживается**: Добавьте новые типы в `ALLOWED_MIME_TYPES`

### Логирование
Все ошибки логируются с подробной информацией:
```typescript
console.error('Ошибка при загрузке файла:', error);
```

### Health Check
Добавлен endpoint `/api/health` для проверки состояния системы.

## Будущие улучшения

- [ ] Автоматическое создание thumbnail для изображений
- [ ] Видео транскодирование
- [ ] Интеграция с антивирусом
- [ ] Поддержка больших файлов через multipart upload
- [ ] Квотирование хранилища для пользователей
- [ ] Автоматическая очистка неиспользуемых файлов